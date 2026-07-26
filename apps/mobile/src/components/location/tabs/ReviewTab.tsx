import { userContext } from "@/contexts/userContext";
import {
  formatRecentReviewsTitle,
  locationReviewCardHeight,
  locationReviewCommentLines,
} from "@/common/map-location";
import {
  createReview,
  deleteReview,
  getReviewsByLocation,
  type LocationReview,
  type ReviewSummary,
  updateReview,
} from "@/service/reviewService";
import {
  uploadContributionImage,
  type PendingContributionImage,
} from "@/service/contributePlaceService";
import { toAbsoluteUrl } from "@/service/url";
import { editReviewReply, replyReview } from "@/service/vendorService";
import {
  AppText,
  Button,
  Card,
  Chip,
  EmptyState,
  IconButton,
  Inline,
  LoadingState,
  MediaPicker,
  NoticeSnackbar,
  Stack,
  TextArea,
} from "@/ui/components";
import { colors, radius, spacing } from "@/ui/tokens";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { Tabs } from "../collapsible-tabs";
import { Icon, Modal, Portal, Surface } from "react-native-paper";
import { VendorReviewReplyDialog } from "./VendorReviewReplyDialog";
import { getReviewComposerKeyboardBehavior } from "./review-composer-keyboard";
import {
  canEditReviewReply,
  canManageReviewReplies,
  canOpenReviewReply,
  getReviewReplyMutation,
  normalizeEntityId,
  validateReviewReply,
} from "./review-reply-model";
import { ImagePreviewModal } from "../ImagePreviewModal";

const MAX_REVIEW_IMAGES = 5;

type ReviewImageDraft = PendingContributionImage & {
  id: string;
  remoteUrl?: string;
};

type ReviewTabProps = {
  embedded?: boolean;
  locationData?: {
    _id?: string;
    id?: string;
    ownerId?: string | { _id?: string; id?: string } | null;
  };
  initialRating?: Partial<ReviewSummary> | null;
  onChanged?: () => void | Promise<void>;
};

export default function ReviewTab({
  embedded = false,
  locationData,
  initialRating,
  onChanged,
}: ReviewTabProps) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ReviewSummary>({
    avgRating: Number(initialRating?.avgRating ?? 0),
    reviewCount: Number(initialRating?.reviewCount ?? 0),
  });
  const [reviews, setReviews] = useState<LocationReview[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [imageDrafts, setImageDrafts] = useState<ReviewImageDraft[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);
  const [composerVisible, setComposerVisible] = useState(false);
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [replyDraft, setReplyDraft] = useState("");
  const [editingReply, setEditingReply] = useState(false);
  const [savingReply, setSavingReply] = useState(false);
  const userState = useContext(userContext) as {
    user?: { _id?: string; id?: string; role?: string } | null;
  } | null;
  const currentUserId = userState?.user?._id ?? userState?.user?.id;
  const locationId = locationData?._id ?? locationData?.id;
  const canManageReplies = canManageReviewReplies(
    userState?.user,
    locationData?.ownerId,
  );
  const selectedReview =
    reviews.find((review) => review.id === selectedReviewId) ?? null;
  const canEditSelectedReply = canEditReviewReply(
    userState?.user,
    selectedReview?.reply?.vendorId,
  );

  const loadReviews = useCallback(
    async (options?: { preserveExisting?: boolean; showLoading?: boolean }) => {
      if (!locationId) {
        const unavailable = {
          success: false as const,
          summary: { avgRating: 0, reviewCount: 0 },
          reviews: [],
          message: "Không tìm thấy địa điểm.",
        };
        setLoading(false);
        return unavailable;
      }
      if (options?.showLoading !== false) setLoading(true);
      const response = await getReviewsByLocation(locationId);
      if (response.success) {
        setSummary(response.summary);
        setReviews(response.reviews);
        setErrorMessage("");
      } else {
        if (!options?.preserveExisting) setReviews([]);
        setErrorMessage(response.message);
      }
      setLoading(false);
      return response;
    },
    [locationId],
  );

  useEffect(() => {
    void Promise.resolve().then(() => loadReviews());
  }, [loadReviews]);

  const formattedRating = useMemo(
    () => Number(summary.avgRating || 0).toFixed(1),
    [summary.avgRating],
  );

  const handleSubmitReview = async () => {
    if (!locationId || submitting) return;
    setSubmitting(true);
    try {
      if (editingReviewId) {
        if (imageDrafts.length) setNotice("Đang tải ảnh đánh giá...");
        const imageUrls = await uploadReviewImages(imageDrafts);
        const response = await updateReview(editingReviewId, {
          rating,
          comment: comment.trim(),
          imageUrls,
        });
        if (!response.success) {
          setNotice(response.message);
          return;
        }
        resetForm();
        setComposerVisible(false);
        setNotice("Đã cập nhật đánh giá.");
        await loadReviews({ showLoading: false });
        await onChanged?.();
        return;
      }
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setNotice("Bạn cần bật quyền vị trí để gửi đánh giá mới.");
        return;
      }
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      if (imageDrafts.length) setNotice("Đang tải ảnh đánh giá...");
      const imageUrls = await uploadReviewImages(imageDrafts);
      const response = await createReview({
        locationId,
        rating,
        comment: comment.trim(),
        imageUrls,
        deviceLatitude: currentLocation.coords.latitude,
        deviceLongitude: currentLocation.coords.longitude,
        accuracyMeters: currentLocation.coords.accuracy ?? undefined,
      });
      if (!response.success) {
        setNotice(response.message);
        return;
      }
      resetForm();
      setComposerVisible(false);
      setNotice("Đã gửi đánh giá.");
      await loadReviews({ showLoading: false });
      await onChanged?.();
    } catch (error) {
      console.log("Error submitting review:", error);
      setNotice(getReviewSubmitErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setEditingReviewId(null);
    setRating(5);
    setComment("");
    setImageDrafts([]);
  };

  const startEdit = (review: LocationReview) => {
    setEditingReviewId(review.id);
    setRating(review.rating);
    setComment(review.comment);
    setImageDrafts(
      getReviewImageUrls(review).map((url, index) => ({
        id: url || `review-image-${index}`,
        uri: toAbsoluteUrl(url) ?? url,
        fileName: `review-image-${index + 1}.jpg`,
        mimeType: "image/jpeg",
        fileSize: 1024,
        remoteUrl: url,
      })),
    );
    setComposerVisible(true);
  };

  const pickReviewImages = async () => {
    if (imageDrafts.length >= MAX_REVIEW_IMAGES) {
      setNotice("Bạn chỉ được chọn tối đa 5 ảnh cho một đánh giá.");
      return;
    }

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (permission.status !== "granted") {
      setNotice("Bạn cần cấp quyền thư viện ảnh để thêm ảnh đánh giá.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: MAX_REVIEW_IMAGES - imageDrafts.length,
      quality: 0.8,
      exif: true,
    });

    if (result.canceled) return;

    const selectedImages = result.assets.map((asset, index) => ({
      id: `review-${Date.now()}-${index}`,
      uri: asset.uri,
      fileName: asset.fileName ?? `review-${Date.now()}-${index}.jpg`,
      mimeType: asset.mimeType ?? "image/jpeg",
      fileSize: asset.fileSize ?? 1024,
      capturedAt:
        asset.exif?.DateTimeOriginal ||
        asset.exif?.DateTimeDigitized ||
        asset.exif?.DateTime ||
        undefined,
    }));

    setImageDrafts((current) =>
      [...current, ...selectedImages].slice(0, MAX_REVIEW_IMAGES),
    );
  };

  const removeReviewImage = (id: string) => {
    setImageDrafts((current) => current.filter((item) => item.id !== id));
  };

  const confirmDeleteReview = async (reviewId: string) => {
    if (deletingReviewId) return;
    setDeletingReviewId(reviewId);
    try {
      const response = await deleteReview(reviewId);
      if (!response.success) {
        setNotice(response.message);
        return;
      }
      if (editingReviewId === reviewId) resetForm();
      setNotice("Đã xóa đánh giá.");
      await loadReviews({ showLoading: false });
      await onChanged?.();
    } finally {
      setDeletingReviewId(null);
    }
  };

  const requestDelete = (review: LocationReview) =>
    Alert.alert("Xóa đánh giá", "Bạn có chắc muốn xóa đánh giá này không?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: () => void confirmDeleteReview(review.id),
      },
    ]);

  const openReplyDialog = (review: LocationReview) => {
    if (
      !canOpenReviewReply(
        canManageReplies,
        Boolean(review.reply?.content),
      )
    ) {
      return;
    }
    Keyboard.dismiss();
    setSelectedReviewId(review.id);
    setReplyDraft("");
    setEditingReply(false);
  };

  const closeReplyDialog = () => {
    Keyboard.dismiss();
    setSelectedReviewId(null);
    setReplyDraft("");
    setEditingReply(false);
  };

  const startReplyEdit = () => {
    if (!canEditSelectedReply || !selectedReview?.reply?.content) return;
    setReplyDraft(selectedReview.reply.content);
    setEditingReply(true);
  };

  const cancelReplyEdit = () => {
    Keyboard.dismiss();
    setReplyDraft("");
    setEditingReply(false);
  };

  const submitVendorReply = async () => {
    if (!selectedReview || savingReply) return;
    const validation = validateReviewReply(replyDraft);
    if (validation.error) {
      setNotice(validation.error);
      return;
    }

    setSavingReply(true);
    try {
      const mutation = getReviewReplyMutation(editingReply);
      const response =
        mutation === "edit"
          ? await editReviewReply(selectedReview.id, validation.content)
          : await replyReview(selectedReview.id, validation.content);

      if (!response.success) {
        setNotice(response.message);
        return;
      }

      setNotice(response.message);
      const optimisticCreatedAt =
        selectedReview.reply?.createdAt ?? new Date().toISOString();
      setReviews((current) =>
        current.map((review) =>
          review.id === selectedReview.id
            ? {
                ...review,
                reply: {
                  vendorId: normalizeEntityId(userState?.user),
                  content: validation.content,
                  createdAt: optimisticCreatedAt,
                },
              }
            : review,
        ),
      );
      setReplyDraft("");
      setEditingReply(false);

      const refreshed = await loadReviews({
        preserveExisting: true,
        showLoading: false,
      });
      if (!refreshed.success) {
        setNotice("Đã lưu phản hồi nhưng chưa thể tải lại danh sách.");
      }
    } finally {
      setSavingReply(false);
    }
  };

  if (loading)
    return (
      <View style={{ minHeight: 180 }}>
        <LoadingState label="Đang tải đánh giá" />
      </View>
    );

  const canReview = Boolean(
    currentUserId && currentUserId !== getId(locationData?.ownerId),
  );
  const header = (
    <Stack>
      <Card>
        <Inline>
          <Stack gap={spacing[1]} style={{ flex: 1 }}>
            <AppText variant="largeTitle">{formattedRating}</AppText>
            <StarRating rating={summary.avgRating} />
          </Stack>
          {canReview ? (
            <Button
              icon="star-outline"
              label="Viết đánh giá"
              onPress={() => {
                resetForm();
                setComposerVisible(true);
              }}
              variant="secondary"
            />
          ) : null}
        </Inline>
      </Card>
      {errorMessage ? (
        <AppText style={{ color: colors.accentRed }} variant="subhead">
          {errorMessage}
        </AppText>
      ) : null}
    </Stack>
  );
  const recentHeader = (
    <AppText variant="headline">
      {formatRecentReviewsTitle(summary.reviewCount)}
    </AppText>
  );
  const reviewItems = reviews.map((item) => (
    <ReviewCard
      canEdit={Boolean(currentUserId && item.user?.id === currentUserId)}
      canOpenReply={canOpenReviewReply(
        canManageReplies,
        Boolean(item.reply?.content),
      )}
      deleting={deletingReviewId === item.id}
      key={item.id}
      onDelete={requestDelete}
      onEdit={startEdit}
      onReply={openReplyDialog}
      review={item}
    />
  ));
  const emptyState = (
    <EmptyState
      icon="star-outline"
      title="Chưa có đánh giá"
      supportingText="Hãy là người đầu tiên chia sẻ trải nghiệm."
    />
  );
  const noticeBar = (
    <NoticeSnackbar message={notice} onDismiss={() => setNotice("")} />
  );
  const composer = (
    <ReviewComposer
      comment={comment}
      editing={Boolean(editingReviewId)}
      imageDrafts={imageDrafts}
      onChangeComment={setComment}
      onChangeRating={setRating}
      onDismiss={() => {
        setComposerVisible(false);
        resetForm();
      }}
      onPickImages={pickReviewImages}
      onRemoveImage={removeReviewImage}
      onSubmit={handleSubmitReview}
      rating={rating}
      submitting={submitting}
      visible={composerVisible}
    />
  );
  const replyDialog = (
    <VendorReviewReplyDialog
      canEditReply={canEditSelectedReply}
      draft={replyDraft}
      editing={editingReply}
      onCancelEdit={cancelReplyEdit}
      onChangeDraft={setReplyDraft}
      onDismiss={closeReplyDialog}
      onStartEdit={startReplyEdit}
      onSubmit={() => void submitVendorReply()}
      review={selectedReview}
      saving={savingReply}
      visible={Boolean(selectedReview)}
    />
  );

  if (embedded)
    return (
      <Stack gap={spacing[3]}>
        {header}
        {recentHeader}
        {reviewItems.length ? (
          <ScrollView
            contentContainerStyle={{ gap: spacing[3] }}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {reviewItems}
          </ScrollView>
        ) : (
          emptyState
        )}
        {composer}
        {replyDialog}
        {noticeBar}
      </Stack>
    );

  return (
    <>
      <Tabs.FlatList
        contentContainerStyle={{ gap: spacing[3], padding: spacing[4] }}
        data={reviews}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={emptyState}
        ListFooterComponent={noticeBar}
        ListHeaderComponent={
          <Stack>
            {header}
            {recentHeader}
          </Stack>
        }
        renderItem={({ item }) => (
          <ReviewCard
            canEdit={Boolean(currentUserId && item.user?.id === currentUserId)}
            canOpenReply={canOpenReviewReply(
              canManageReplies,
              Boolean(item.reply?.content),
            )}
            deleting={deletingReviewId === item.id}
            onDelete={requestDelete}
            onEdit={startEdit}
            onReply={openReplyDialog}
            review={item}
          />
        )}
      />
      {composer}
      {replyDialog}
    </>
  );
}

function ReviewCard({
  review,
  canEdit,
  canOpenReply,
  onEdit,
  onDelete,
  onReply,
  deleting,
}: {
  review: LocationReview;
  canEdit: boolean;
  canOpenReply: boolean;
  onEdit: (review: LocationReview) => void;
  onDelete: (review: LocationReview) => void;
  onReply: (review: LocationReview) => void;
  deleting: boolean;
}) {
  const hasReply = Boolean(review.reply?.content);
  const imageUrls = getReviewImageUrls(review)
    .map((url) => toAbsoluteUrl(url))
    .filter((url): url is string => Boolean(url));
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const previewImages = imageUrls.map((url, index) => ({
    description: `Ảnh đánh giá ${index + 1}`,
    title: review.user?.fullName || "Ảnh đánh giá",
    url,
  }));
  return (
    <>
    <Pressable
      accessibilityHint={
        canOpenReply ? "Mở phản hồi của đánh giá" : undefined
      }
      accessibilityRole={canOpenReply ? "button" : undefined}
      disabled={!canOpenReply}
      onPress={() => onReply(review)}
      style={({ pressed }) => ({ opacity: pressed ? 0.86 : 1 })}
    >
      <Surface
        elevation={0}
        style={{
          backgroundColor: colors.surfaceBase,
          borderRadius: radius.large,
          height: locationReviewCardHeight,
          padding: spacing[4],
          width: 280,
        }}
      >
        <Stack gap={spacing[2]} style={{ flex: 1 }}>
          <Inline style={{ alignItems: "flex-start" }}>
            <Stack gap={spacing[1]} style={{ flex: 1 }}>
              <AppText numberOfLines={1} variant="headline">
                {review.user?.fullName || "Người dùng"}
              </AppText>
              <AppText style={{ color: colors.textTertiary }} variant="caption">
                {formatRelativeDate(review.createdAt)}
              </AppText>
              <StarRating rating={review.rating} size={14} />
            </Stack>
            {canEdit ? (
              <Inline gap={0}>
                <IconButton
                  icon="pencil-outline"
                  label="Sửa"
                  onPress={() => onEdit(review)}
                />
                <IconButton
                  icon="delete-outline"
                  label="Xóa"
                  onPress={() => onDelete(review)}
                />
              </Inline>
            ) : canOpenReply ? (
              <Chip
                icon={hasReply ? "check" : "reply"}
                label={hasReply ? "Đã trả lời" : "Phản hồi"}
              />
            ) : null}
          </Inline>
          <Stack gap={spacing[2]}>
            <AppText
              numberOfLines={imageUrls.length ? 2 : locationReviewCommentLines}
              style={{ color: colors.textSecondary, opacity: deleting ? 0.5 : 1 }}
              variant="body"
            >
              {review.comment}
            </AppText>
            {imageUrls.length ? (
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <Inline gap={spacing[2]}>
                  {imageUrls.map((url, index) => (
                    <Pressable
                      accessibilityLabel="Xem ảnh trong đánh giá"
                      accessibilityRole="imagebutton"
                      key={url}
                      onPress={(event) => {
                        event.stopPropagation();
                        setPreviewIndex(index);
                      }}
                      style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}
                    >
                    <Image
                      alt="Ảnh trong đánh giá"
                      contentFit="cover"
                      source={{ uri: url }}
                      style={{
                        backgroundColor: colors.surfaceMedia,
                        borderRadius: radius.medium,
                        height: 44,
                        width: 44,
                      }}
                    />
                    </Pressable>
                  ))}
                </Inline>
              </ScrollView>
            ) : null}
          </Stack>
        </Stack>
      </Surface>
    </Pressable>
    <ImagePreviewModal
      images={previewImages}
      initialIndex={previewIndex ?? 0}
      locationName="Đánh giá"
      onDismiss={() => setPreviewIndex(null)}
      visible={previewIndex !== null}
    />
    </>
  );
}

function ReviewComposer({
  visible,
  editing,
  rating,
  comment,
  imageDrafts,
  submitting,
  onDismiss,
  onChangeRating,
  onChangeComment,
  onPickImages,
  onRemoveImage,
  onSubmit,
}: {
  visible: boolean;
  editing: boolean;
  rating: number;
  comment: string;
  imageDrafts: ReviewImageDraft[];
  submitting: boolean;
  onDismiss: () => void;
  onChangeRating: (rating: number) => void;
  onChangeComment: (comment: string) => void;
  onPickImages: () => void;
  onRemoveImage: (id: string) => void;
  onSubmit: () => void;
}) {
  const dismissComposer = () => {
    Keyboard.dismiss();
    onDismiss();
  };

  return (
    <Portal>
      <KeyboardAvoidingView
        behavior={getReviewComposerKeyboardBehavior(Platform.OS)}
        pointerEvents="box-none"
        style={{ flex: 1 }}
      >
        <Modal
          contentContainerStyle={{
            backgroundColor: colors.surfaceRaised,
            borderTopLeftRadius: radius.sheet,
            borderTopRightRadius: radius.sheet,
            gap: spacing[4],
            marginTop: "auto",
            padding: spacing[5],
            paddingBottom: spacing[7],
          }}
          onDismiss={dismissComposer}
          visible={visible}
        >
          <Inline style={{ justifyContent: "space-between" }}>
            <AppText variant="title2">
              {editing ? "Sửa đánh giá" : "Viết đánh giá"}
            </AppText>
            <IconButton icon="close" label="Đóng" onPress={dismissComposer} />
          </Inline>
          <PressableStarRating onChange={onChangeRating} rating={rating} />
          <TextArea
            label="Trải nghiệm của bạn"
            onChangeText={onChangeComment}
            placeholder="Chia sẻ trải nghiệm của bạn"
            value={comment}
          />
          <MediaPicker
            addLabel="Thêm ảnh đánh giá"
            items={imageDrafts.map((item) => ({
              id: item.id,
              name: item.fileName,
              uri: item.uri,
              metadata: item.remoteUrl ? "Ảnh đã lưu" : "Ảnh mới",
            }))}
            maxCount={MAX_REVIEW_IMAGES}
            onAdd={onPickImages}
            onRemove={onRemoveImage}
            supportingText="Ảnh sẽ được tải lên trước khi gửi đánh giá."
            title="Ảnh đánh giá"
          />
          <Button
            disabled={submitting}
            icon={editing ? "content-save" : "send"}
            label={editing ? "Cập nhật" : "Gửi đánh giá"}
            loading={submitting}
            onPress={onSubmit}
            width="full"
          />
        </Modal>
      </KeyboardAvoidingView>
    </Portal>
  );
}

async function uploadReviewImages(imageDrafts: ReviewImageDraft[]) {
  const urls: string[] = [];
  for (const image of imageDrafts) {
    if (image.remoteUrl) {
      urls.push(image.remoteUrl);
      continue;
    }
    const uploadedUrl = await uploadContributionImage(image);
    console.log("Review image uploaded:", uploadedUrl);
    urls.push(uploadedUrl);
  }
  return urls;
}

function getReviewSubmitErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message;
  }

  const maybeAxiosError = error as {
    response?: { data?: { message?: unknown } };
  };
  const apiMessage = maybeAxiosError.response?.data?.message;
  if (typeof apiMessage === "string" && apiMessage.trim()) {
    return apiMessage;
  }
  if (Array.isArray(apiMessage)) {
    const text = apiMessage
      .filter((item): item is string => typeof item === "string")
      .join("\n");
    if (text.trim()) return text;
  }

  return "Không thể gửi đánh giá lúc này.";
}

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return (
    <Inline gap={1}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Icon
          color={
            index < Math.round(rating || 0)
              ? colors.accentOrange
              : colors.borderStrong
          }
          key={index}
          size={size}
          source="star"
        />
      ))}
    </Inline>
  );
}

function PressableStarRating({
  rating,
  onChange,
}: {
  rating: number;
  onChange: (value: number) => void;
}) {
  return (
    <Inline>
      {Array.from({ length: 5 }).map((_, index) => {
        const value = index + 1;
        return (
          <Pressable
            hitSlop={8}
            key={value}
            onPress={() => onChange(value)}
            style={{
              alignItems: "center",
              height: 42,
              justifyContent: "center",
              width: 42,
            }}
          >
            <Icon
              color={
                value <= rating ? colors.accentOrange : colors.borderStrong
              }
              size={30}
              source="star"
            />
          </Pressable>
        );
      })}
    </Inline>
  );
}

function getId(value: unknown) {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (typeof value === "object") {
    const item = value as { _id?: string; id?: string };
    return item._id ?? item.id ?? "";
  }
  return "";
}

function getReviewImageUrls(review: LocationReview) {
  const source = review as LocationReview & {
    imageUrls?: unknown[];
    imagesUrls?: unknown[];
  };
  const candidates = [
    ...(Array.isArray(source.images) ? source.images : []),
    ...(Array.isArray(source.imageUrls) ? source.imageUrls : []),
    ...(Array.isArray(source.imagesUrls) ? source.imagesUrls : []),
  ];

  const urls = candidates
    .map((image) => {
      if (typeof image === "string") return image;
      if (!image || typeof image !== "object") return "";
      const value = image as { url?: unknown; publicUrl?: unknown };
      return typeof value.url === "string"
        ? value.url
        : typeof value.publicUrl === "string"
          ? value.publicUrl
          : "";
    })
    .filter((url) => Boolean(url.trim()));

  return Array.from(new Set(urls));
}

function formatRelativeDate(value?: string) {
  if (!value) return "";
  const diffDays = Math.floor(
    (Date.now() - new Date(value).getTime()) / 86400000,
  );
  if (diffDays <= 0) return "hôm nay";
  if (diffDays < 7) return `${diffDays} ngày trước`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} tuần trước`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} tháng trước`;
  return `${Math.floor(diffDays / 365)} năm trước`;
}
