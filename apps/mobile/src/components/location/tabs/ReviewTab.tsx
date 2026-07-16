import { userContext } from "@/contexts/userContext";
import { formatRecentReviewsTitle, locationReviewCardHeight, locationReviewCommentLines } from "@/common/map-location";
import { createReview, deleteReview, getReviewsByLocation, type LocationReview, type ReviewSummary, updateReview } from "@/service/reviewService";
import { AppText, Button, Card, Chip, EmptyState, IconButton, Inline, LoadingState, NoticeSnackbar, Stack, TextArea } from "@/ui/components";
import { colors, radius, spacing } from "@/ui/tokens";
import * as Location from "expo-location";
import React, { useCallback, useContext, useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";
import { Tabs } from "react-native-collapsible-tab-view";
import { Icon, Modal, Portal, Surface } from "react-native-paper";

type ReviewTabProps = { embedded?: boolean; locationData?: { _id?: string; id?: string; ownerId?: string | { _id?: string; id?: string } | null }; initialRating?: Partial<ReviewSummary> | null };

export default function ReviewTab({ embedded = false, locationData, initialRating }: ReviewTabProps) {
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
  const [composerVisible, setComposerVisible] = useState(false);
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
      const currentLocation = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.High });
      const response = await createReview({ locationId, rating, comment: comment.trim(), deviceLatitude: currentLocation.coords.latitude, deviceLongitude: currentLocation.coords.longitude, accuracyMeters: currentLocation.coords.accuracy ?? undefined });
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

  const requestDelete = (review: LocationReview) => Alert.alert("Xóa đánh giá", "Bạn có chắc muốn xóa đánh giá này không?", [
    { text: "Hủy", style: "cancel" },
    { text: "Xóa", style: "destructive", onPress: () => void confirmDeleteReview(review.id) },
  ]);

  if (loading) return <View style={{ minHeight: 180 }}><LoadingState label="Đang tải đánh giá" /></View>;

  const canReview = Boolean(currentUserId && currentUserId !== getId(locationData?.ownerId));
  const header = (
    <Stack>
      <Card><Inline><Stack gap={spacing[1]} style={{ flex: 1 }}><AppText variant="largeTitle">{formattedRating}</AppText><StarRating rating={summary.avgRating} /></Stack>{canReview ? <Button icon="star-outline" label="Viết đánh giá" onPress={() => { resetForm(); setComposerVisible(true); }} variant="secondary" /> : null}</Inline></Card>
      {errorMessage ? <AppText style={{ color: colors.accentRed }} variant="subhead">{errorMessage}</AppText> : null}
    </Stack>
  );
  const recentHeader = <AppText variant="headline">{formatRecentReviewsTitle(summary.reviewCount)}</AppText>;
  const reviewItems = reviews.map((item) => <ReviewCard canEdit={Boolean(currentUserId && item.user?.id === currentUserId)} deleting={deletingReviewId === item.id} key={item.id} onDelete={requestDelete} onEdit={startEdit} review={item} />);
  const emptyState = <EmptyState icon="star-outline" title="Chưa có đánh giá" supportingText="Hãy là người đầu tiên chia sẻ trải nghiệm." />;
  const noticeBar = <NoticeSnackbar message={notice} onDismiss={() => setNotice("")} />;
  const composer = <ReviewComposer comment={comment} editing={Boolean(editingReviewId)} onChangeComment={setComment} onChangeRating={setRating} onDismiss={() => { setComposerVisible(false); resetForm(); }} onSubmit={handleSubmitReview} rating={rating} submitting={submitting} visible={composerVisible} />;

  if (embedded) return <Stack gap={spacing[3]}>{header}{recentHeader}{reviewItems.length ? <ScrollView contentContainerStyle={{ gap: spacing[3] }} horizontal showsHorizontalScrollIndicator={false}>{reviewItems}</ScrollView> : emptyState}{composer}{noticeBar}</Stack>;

  return <><Tabs.FlatList contentContainerStyle={{ gap: spacing[3], padding: spacing[4] }} data={reviews} keyExtractor={(item) => item.id} ListEmptyComponent={emptyState} ListFooterComponent={noticeBar} ListHeaderComponent={<Stack>{header}{recentHeader}</Stack>} renderItem={({ item }) => <ReviewCard canEdit={Boolean(currentUserId && item.user?.id === currentUserId)} deleting={deletingReviewId === item.id} onDelete={requestDelete} onEdit={startEdit} review={item} />} />{composer}</>;
}

function ReviewCard({ review, canEdit, onEdit, onDelete, deleting }: { review: LocationReview; canEdit: boolean; onEdit: (review: LocationReview) => void; onDelete: (review: LocationReview) => void; deleting: boolean }) {
  const hasReply = Boolean(review.reply?.content);
  return (
    <Surface elevation={0} style={{ backgroundColor: colors.surfaceBase, borderRadius: radius.large, height: locationReviewCardHeight, padding: spacing[4], width: 280 }}>
      <Stack gap={spacing[2]} style={{ flex: 1 }}>
        <Inline style={{ alignItems: "flex-start" }}>
          <Stack gap={spacing[1]} style={{ flex: 1 }}>
            <AppText numberOfLines={1} variant="headline">{review.user?.fullName || "Người dùng"}</AppText>
            <AppText style={{ color: colors.textTertiary }} variant="caption">{formatRelativeDate(review.createdAt)}</AppText>
            <StarRating rating={review.rating} size={14} />
          </Stack>
          {canEdit ? <Inline gap={0}><IconButton icon="pencil-outline" label="Sửa" onPress={() => onEdit(review)} /><IconButton icon="delete-outline" label="Xóa" onPress={() => onDelete(review)} /></Inline> : hasReply ? <Chip icon="check" label="Đã trả lời" /> : null}
        </Inline>
        <AppText numberOfLines={locationReviewCommentLines} style={{ color: colors.textSecondary, opacity: deleting ? 0.5 : 1 }} variant="body">{review.comment}</AppText>
      </Stack>
    </Surface>
  );
}

function ReviewComposer({ visible, editing, rating, comment, submitting, onDismiss, onChangeRating, onChangeComment, onSubmit }: { visible: boolean; editing: boolean; rating: number; comment: string; submitting: boolean; onDismiss: () => void; onChangeRating: (rating: number) => void; onChangeComment: (comment: string) => void; onSubmit: () => void }) {
  return <Portal><Modal contentContainerStyle={{ backgroundColor: colors.surfaceRaised, borderTopLeftRadius: radius.sheet, borderTopRightRadius: radius.sheet, gap: spacing[4], marginTop: "auto", padding: spacing[5], paddingBottom: spacing[7] }} onDismiss={onDismiss} visible={visible}><Inline style={{ justifyContent: "space-between" }}><AppText variant="title2">{editing ? "Sửa đánh giá" : "Viết đánh giá"}</AppText><IconButton icon="close" label="Đóng" onPress={onDismiss} /></Inline><PressableStarRating onChange={onChangeRating} rating={rating} /><TextArea label="Trải nghiệm của bạn" onChangeText={onChangeComment} placeholder="Chia sẻ trải nghiệm của bạn" value={comment} /><Button disabled={submitting} icon={editing ? "content-save" : "send"} label={editing ? "Cập nhật" : "Gửi đánh giá"} loading={submitting} onPress={onSubmit} width="full" /></Modal></Portal>;
}

function StarRating({ rating, size = 16 }: { rating: number; size?: number }) {
  return <Inline gap={1}>{Array.from({ length: 5 }).map((_, index) => <Icon color={index < Math.round(rating || 0) ? colors.accentOrange : colors.borderStrong} key={index} size={size} source="star" />)}</Inline>;
}

function PressableStarRating({ rating, onChange }: { rating: number; onChange: (value: number) => void }) {
  return <Inline>{Array.from({ length: 5 }).map((_, index) => { const value = index + 1; return <Pressable hitSlop={8} key={value} onPress={() => onChange(value)} style={{ alignItems: "center", height: 42, justifyContent: "center", width: 42 }}><Icon color={value <= rating ? colors.accentOrange : colors.borderStrong} size={30} source="star" /></Pressable>; })}</Inline>;
}

function getId(value: unknown) { if (!value) return ""; if (typeof value === "string") return value; if (typeof value === "object") { const item = value as { _id?: string; id?: string }; return item._id ?? item.id ?? ""; } return ""; }

function formatRelativeDate(value?: string) {
  if (!value) return "";
  const diffDays = Math.floor((Date.now() - new Date(value).getTime()) / 86400000);
  if (diffDays <= 0) return "hôm nay";
  if (diffDays < 7) return `${diffDays} ngày trước`;
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} tuần trước`;
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} tháng trước`;
  return `${Math.floor(diffDays / 365)} năm trước`;
}
