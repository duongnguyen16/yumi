import { userContext } from "@/contexts/userContext";
import { createReview, deleteReview, getReviewsByLocation, type LocationReview, type ReviewSummary, updateReview } from "@/service/reviewService";
import { AppText, Button, Card, Chip, EmptyState, Inline, LoadingState, Stack, TextArea } from "@/ui/components";
import { colors, radius, spacing } from "@/ui/tokens";
import * as Location from "expo-location";
import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Alert, Image, Pressable, View } from "react-native";
import { Tabs } from "react-native-collapsible-tab-view";
import { Icon, Snackbar, Surface } from "react-native-paper";

type ReviewTabProps = { locationData?: { _id?: string; id?: string; ownerId?: string | null }; initialRating?: Partial<ReviewSummary> | null };

export default function ReviewTab({ locationData, initialRating }: ReviewTabProps) {
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<ReviewSummary>({ avgRating: Number(initialRating?.avgRating ?? 0), reviewCount: Number(initialRating?.reviewCount ?? 0) });
  const [reviews, setReviews] = useState<LocationReview[]>([]);
  const [errorMessage, setErrorMessage] = useState("");
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState("");
  const [editingReviewId, setEditingReviewId] = useState<string | null>(null);
  const [deletingReviewId, setDeletingReviewId] = useState<string | null>(null);
  const userState = useContext(userContext) as { user?: { _id?: string; id?: string } | null } | null;
  const currentUserId = userState?.user?._id ?? userState?.user?.id;
  const locationId = locationData?._id ?? locationData?.id;

  const loadReviews = useCallback(async (options?: { showLoading?: boolean }) => {
    if (!locationId) {
      setLoading(false);
      return;
    }
    if (options?.showLoading !== false) setLoading(true);
    const response = await getReviewsByLocation(locationId);
    if (response.success) {
      setSummary(response.summary);
      setReviews(response.reviews);
      setErrorMessage("");
    } else {
      setReviews([]);
      setErrorMessage(response.message);
    }
    setLoading(false);
  }, [locationId]);

  useEffect(() => {
    void Promise.resolve().then(() => loadReviews());
  }, [loadReviews]);

  const formattedRating = useMemo(() => Number(summary.avgRating || 0).toFixed(1), [summary.avgRating]);

  const handleSubmitReview = async () => {
    if (!locationId || submitting) return;
    setSubmitting(true);
    try {
      if (editingReviewId) {
        const response = await updateReview(editingReviewId, { rating, comment: comment.trim() });
        if (!response.success) {
          setNotice(response.message);
          return;
        }
        resetForm();
        setNotice("Đã cập nhật đánh giá.");
        await loadReviews({ showLoading: false });
        return;
      }
      const permission = await Location.requestForegroundPermissionsAsync();
      if (permission.status !== "granted") {
        setNotice("Bạn cần bật quyền vị trí để gửi đánh giá mới.");
        return;
      }
      const currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const response = await createReview({ locationId, rating, comment: comment.trim(), deviceLatitude: currentLocation.coords.latitude, deviceLongitude: currentLocation.coords.longitude, accuracyMeters: currentLocation.coords.accuracy ?? undefined });
      if (!response.success) {
        setNotice(response.message);
        return;
      }
      resetForm();
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

  const requestDelete = (review: LocationReview) => Alert.alert("Xóa đánh giá", "Bạn có chắc muốn xóa đánh giá này không?", [
    { text: "Hủy", style: "cancel" },
    { text: "Xóa", style: "destructive", onPress: () => void confirmDeleteReview(review.id) },
  ]);

  if (loading) return <View style={{ minHeight: 180 }}><LoadingState label="Đang tải đánh giá" /></View>;

  return (
    <Tabs.FlatList
      contentContainerStyle={{ gap: spacing[3], padding: spacing[4] }}
      data={reviews}
      keyExtractor={(item) => item.id}
      ListEmptyComponent={<EmptyState icon="star-outline" title="Chưa có đánh giá" supportingText="Hãy là người đầu tiên chia sẻ trải nghiệm." />}
      ListFooterComponent={<Snackbar duration={3000} onDismiss={() => setNotice("")} visible={Boolean(notice)}>{notice}</Snackbar>}
      ListHeaderComponent={
        <Stack>
          <Card>
            <Inline>
              <Stack gap={spacing[1]}><AppText variant="largeTitle">{formattedRating}</AppText><StarRating rating={summary.avgRating} /></Stack>
              <Stack gap={spacing[1]} style={{ flex: 1 }}><AppText variant="headline">{summary.reviewCount} đánh giá</AppText><AppText style={{ color: colors.textSecondary }} variant="caption">Dữ liệu đánh giá mới nhất</AppText></Stack>
            </Inline>
          </Card>
          {currentUserId !== locationData?.ownerId ? (
            <Card>
              <Stack>
                <AppText variant="headline">{editingReviewId ? "Sửa đánh giá" : "Viết đánh giá"}</AppText>
                <PressableStarRating onChange={setRating} rating={rating} />
                <TextArea label="Trải nghiệm của bạn" onChangeText={setComment} placeholder="Chia sẻ trải nghiệm của bạn" value={comment} />
                <Inline style={{ justifyContent: "flex-end" }}>
                  {editingReviewId ? <Button disabled={submitting} label="Hủy" onPress={resetForm} variant="secondary" /> : null}
                  <Button disabled={submitting} icon={editingReviewId ? "content-save" : "send"} label={editingReviewId ? "Cập nhật" : "Gửi đánh giá"} loading={submitting} onPress={handleSubmitReview} />
                </Inline>
              </Stack>
            </Card>
          ) : null}
          {errorMessage ? <AppText style={{ color: colors.accentRed }} variant="subhead">{errorMessage}</AppText> : null}
        </Stack>
      }
      renderItem={({ item }) => <ReviewCard canEdit={Boolean(currentUserId && item.user?.id === currentUserId)} deleting={deletingReviewId === item.id} onDelete={requestDelete} onEdit={startEdit} review={item} />}
    />
  );
}

function ReviewCard({ review, canEdit, onEdit, onDelete, deleting }: { review: LocationReview; canEdit: boolean; onEdit: (review: LocationReview) => void; onDelete: (review: LocationReview) => void; deleting: boolean }) {
  const hasReply = Boolean(review.reply?.content);
  return (
    <Card>
      <Stack>
        <Inline style={{ alignItems: "flex-start" }}>
          <Surface elevation={0} style={{ alignItems: "center", backgroundColor: colors.accentPrimary, borderRadius: radius.pill, height: 44, justifyContent: "center", overflow: "hidden", width: 44 }}>
            {review.user?.avatarUrl ? <Image alt={`Ảnh đại diện của ${review.user.fullName || "người dùng"}`} source={{ uri: review.user.avatarUrl }} style={{ height: 44, width: 44 }} /> : <AppText style={{ color: colors.textInverse }} variant="headline">{getInitials(review.user?.fullName)}</AppText>}
          </Surface>
          <Stack gap={spacing[1]} style={{ flex: 1 }}>
            <Inline style={{ flexWrap: "wrap" }}><AppText variant="headline">{review.user?.fullName || "Người dùng"}</AppText><AppText style={{ color: colors.textTertiary }} variant="caption">{formatRelativeDate(review.createdAt)}</AppText></Inline>
            <StarRating rating={review.rating} size={14} />
          </Stack>
          {hasReply ? <Chip icon="check" label="Đã trả lời" /> : null}
        </Inline>
        <AppText variant="body">{review.comment}</AppText>
        {review.images?.length ? <Inline>{review.images.slice(0, 3).map((image) => <Image alt="Ảnh đánh giá" key={image.url} source={{ uri: image.url }} style={{ backgroundColor: colors.surfaceMedia, borderRadius: radius.medium, height: 76, width: 76 }} />)}</Inline> : null}
        {hasReply ? <Card variant="grouped"><Stack style={{ padding: spacing[3] }}><AppText style={{ color: colors.accentPrimary }} variant="headline">Chủ địa điểm đã trả lời</AppText><AppText style={{ color: colors.textSecondary }} variant="subhead">{review.reply?.content}</AppText></Stack></Card> : null}
        {canEdit ? <Inline style={{ justifyContent: "flex-end" }}><Button icon="pencil-outline" label="Sửa" onPress={() => onEdit(review)} variant="tertiary" /><Button disabled={deleting} icon="delete-outline" label="Xóa" loading={deleting} onPress={() => onDelete(review)} variant="destructive" /></Inline> : null}
      </Stack>
    </Card>
  );
}

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return <Inline gap={1}>{Array.from({ length: 5 }).map((_, index) => <Icon color={index < Math.round(rating || 0) ? colors.accentOrange : colors.borderStrong} key={index} size={size} source="star" />)}</Inline>;
}

function PressableStarRating({ rating, onChange }: { rating: number; onChange: (value: number) => void }) {
  return <Inline>{Array.from({ length: 5 }).map((_, index) => { const value = index + 1; return <Pressable hitSlop={8} key={value} onPress={() => onChange(value)} style={{ alignItems: "center", height: 42, justifyContent: "center", width: 42 }}><Icon color={value <= rating ? colors.accentOrange : colors.borderStrong} size={30} source="star" /></Pressable>; })}</Inline>;
}

function getInitials(name?: string) {
  if (!name?.trim()) return "U";
  return name.trim().split(/\s+/).slice(-2).map((part) => part[0]).join("").toUpperCase();
}

function formatRelativeDate(value?: string) {
  if (!value) return "";
  const diffDays = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
  if (diffDays <= 0) return "hôm nay";
  if (diffDays < 7) return `${diffDays} ngày trước`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} tuần trước`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} tháng trước`;
  return `${Math.floor(diffDays / 365)} năm trước`;
}
