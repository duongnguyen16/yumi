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
  NoticeSnackbar,
  Stack,
  TextArea,
} from "@/ui/components";
import { colors, radius, spacing } from "@/ui/tokens";
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
  canManageReviewReplies,
  getReviewReplyMutation,
  normalizeEntityId,
  validateReviewReply,
} from "./review-reply-model";

type ReviewTabProps = {
  embedded?: boolean;
  locationData?: {
    _id?: string;
    id?: string;
    ownerId?: string | { _id?: string; id?: string } | null;
  };
  initialRating?: Partial<ReviewSummary> | null;
};

export default function ReviewTab({
  embedded = false,
  locationData,
  initialRating,
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
        const response = await updateReview(editingReviewId, {
          rating,
          comment: comment.trim(),
        });
        if (!response.success) {
          setNotice(response.message);
          return;
        }
        resetForm();
        setComposerVisible(false);
        setNotice("Đã cập nhật đánh giá.");
        await loadReviews({ showLoading: false });
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
      const response = await createReview({
        locationId,
        rating,
        comment: comment.trim(),
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
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setEditingReviewId(null);
    setRating(5);
    setComment("");
  };

  const startEdit = (review: LocationReview) => {
    setEditingReviewId(review.id);
    setRating(review.rating);
    setComment(review.comment);
    setComposerVisible(true);
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
    if (!canManageReplies) return;
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
    if (!selectedReview?.reply?.content) return;
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
      canReply={canManageReplies}
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
      onChangeComment={setComment}
      onChangeRating={setRating}
      onDismiss={() => {
        setComposerVisible(false);
        resetForm();
      }}
      onSubmit={handleSubmitReview}
      rating={rating}
      submitting={submitting}
      visible={composerVisible}
    />
  );
  const replyDialog = (
    <VendorReviewReplyDialog
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
            canReply={canManageReplies}
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
  canReply,
  onEdit,
  onDelete,
  onReply,
  deleting,
}: {
  review: LocationReview;
  canEdit: boolean;
  canReply: boolean;
  onEdit: (review: LocationReview) => void;
  onDelete: (review: LocationReview) => void;
  onReply: (review: LocationReview) => void;
  deleting: boolean;
}) {
  const hasReply = Boolean(review.reply?.content);
  return (
    <Pressable
      accessibilityHint={canReply ? "Mở hộp thoại phản hồi đánh giá" : undefined}
      accessibilityRole={canReply ? "button" : undefined}
      disabled={!canReply}
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
            ) : canReply ? (
              <Chip
                icon={hasReply ? "check" : "reply"}
                label={hasReply ? "Đã trả lời" : "Phản hồi"}
              />
            ) : hasReply ? (
              <Chip icon="check" label="Đã trả lời" />
            ) : null}
          </Inline>
          <AppText
            numberOfLines={locationReviewCommentLines}
            style={{ color: colors.textSecondary, opacity: deleting ? 0.5 : 1 }}
            variant="body"
          >
            {review.comment}
          </AppText>
        </Stack>
      </Surface>
    </Pressable>
  );
}

function ReviewComposer({
  visible,
  editing,
  rating,
  comment,
  submitting,
  onDismiss,
  onChangeRating,
  onChangeComment,
  onSubmit,
}: {
  visible: boolean;
  editing: boolean;
  rating: number;
  comment: string;
  submitting: boolean;
  onDismiss: () => void;
  onChangeRating: (rating: number) => void;
  onChangeComment: (comment: string) => void;
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
