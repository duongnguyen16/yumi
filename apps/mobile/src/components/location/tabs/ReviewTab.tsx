import { userContext } from "@/contexts/userContext";
import {
  createReview,
  deleteReview,
  getReviewsByLocation,
  LocationReview,
  ReviewSummary,
  updateReview,
} from "@/service/reviewService";
import * as Location from "expo-location";
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { Alert, Image, Pressable, StyleSheet, View } from "react-native";
import { Tabs } from "react-native-collapsible-tab-view";
import {
  ActivityIndicator,
  Button,
  Card,
  Chip,
  Icon,
  Snackbar,
  Text,
  TextInput,
} from "react-native-paper";

type ReviewTabProps = {
  locationData?: any;
  initialRating?: Partial<ReviewSummary> | null;
};

export default function ReviewTab({
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
  const userState = useContext(userContext) as {
    user?: { _id?: string; id?: string } | null;
  } | null;
  const currentUserId = userState?.user?._id ?? userState?.user?.id;
  const locationId = locationData?._id ?? locationData?.id;
  console.log(currentUserId);
  const loadReviews = useCallback(
    async (options?: { showLoading?: boolean }) => {
      if (!locationId) {
        console.log("No locationId provided, skipping loadReviews.");
        setLoading(false);
        return;
      }
      if (options?.showLoading !== false) {
        setLoading(true);
      }
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
    if (!locationId || submitting) {
      return;
    }

    const trimmedComment = comment.trim();

    setSubmitting(true);
    try {
      if (editingReviewId) {
        const response = await updateReview(editingReviewId, {
          rating,
          comment: trimmedComment,
        });

        if (!response.success) {
          setNotice(response.message);
          return;
        }

        setComment("");
        setRating(5);
        setEditingReviewId(null);
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
        comment: trimmedComment,
        deviceLatitude: currentLocation.coords.latitude,
        deviceLongitude: currentLocation.coords.longitude,
        accuracyMeters: currentLocation.coords.accuracy ?? undefined,
      });

      if (!response.success) {
        setNotice(response.message);
        return;
      }

      setComment("");
      setRating(5);
      setNotice("Đã gửi đánh giá.");
      await loadReviews({ showLoading: false });
    } finally {
      setSubmitting(false);
    }
  };

  const handleStartEdit = (review: LocationReview) => {
    setEditingReviewId(review.id);
    setRating(review.rating);
    setComment(review.comment);
  };

  const handleCancelEdit = () => {
    setEditingReviewId(null);
    setRating(5);
    setComment("");
  };

  const handleDeleteReview = (review: LocationReview) => {
    Alert.alert("Xóa đánh giá", "Bạn có chắc muốn xóa đánh giá này không?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: () => {
          void confirmDeleteReview(review.id);
        },
      },
    ]);
  };

  const confirmDeleteReview = async (reviewId: string) => {
    if (deletingReviewId) {
      return;
    }

    setDeletingReviewId(reviewId);
    try {
      const response = await deleteReview(reviewId);
      if (!response.success) {
        setNotice(response.message);
        return;
      }

      if (editingReviewId === reviewId) {
        handleCancelEdit();
      }

      setNotice("Đã xóa đánh giá.");
      await loadReviews({ showLoading: false });
    } finally {
      setDeletingReviewId(null);
    }
  };

  if (loading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <Tabs.FlatList
      data={reviews}
      keyExtractor={(item) => item.id}
      contentContainerStyle={{
        gap: 12,
      }}
      ListHeaderComponent={
        <>
          <Card mode="contained" style={styles.summaryCard}>
            <Card.Content style={styles.summaryContent}>
              <View>
                <Text variant="displaySmall" style={styles.ratingText}>
                  {formattedRating}
                </Text>
                <StarRating rating={summary.avgRating} />
              </View>

              <View style={styles.summaryMeta}>
                <Text variant="titleMedium" style={styles.reviewCount}>
                  {summary.reviewCount} reviews
                </Text>
                <Text variant="bodySmall" style={styles.supportText}>
                  Dữ liệu đánh giá mới nhất
                </Text>
              </View>
            </Card.Content>
          </Card>
          {currentUserId !== locationData?.ownerId && (
            <Card mode="contained" style={styles.formCard}>
              <Card.Content>
                <Text variant="titleMedium" style={styles.formTitle}>
                  {editingReviewId ? "Sửa đánh giá" : "Viết đánh giá"}
                </Text>

                <PressableStarRating rating={rating} onChange={setRating} />

                <TextInput
                  mode="outlined"
                  value={comment}
                  onChangeText={setComment}
                  placeholder="Chia sẻ trải nghiệm của bạn..."
                  multiline
                  numberOfLines={4}
                  style={styles.commentInput}
                />

                <View style={styles.formActions}>
                  {editingReviewId ? (
                    <Button
                      mode="outlined"
                      onPress={handleCancelEdit}
                      disabled={submitting}
                      style={styles.cancelButton}
                    >
                      Hủy
                    </Button>
                  ) : null}
                  <Button
                    mode="contained"
                    icon={editingReviewId ? "content-save" : "send"}
                    loading={submitting}
                    disabled={submitting}
                    onPress={handleSubmitReview}
                    style={styles.submitButton}
                  >
                    {editingReviewId ? "Cập nhật" : "Gửi đánh giá"}
                  </Button>
                </View>
              </Card.Content>
            </Card>
          )}

          {errorMessage ? (
            <Text style={styles.errorText}>{errorMessage}</Text>
          ) : null}
        </>
      }
      ListEmptyComponent={
        <Card mode="contained" style={styles.emptyCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.emptyTitle}>
              Địa điểm này chưa có đánh giá
            </Text>
          </Card.Content>
        </Card>
      }
      renderItem={({ item }) => (
        <ReviewCard
          review={item}
          canEdit={Boolean(currentUserId && item.user?.id === currentUserId)}
          onEdit={handleStartEdit}
          onDelete={handleDeleteReview}
          deleting={deletingReviewId === item.id}
        />
      )}
      ListFooterComponent={
        <Snackbar
          visible={Boolean(notice)}
          onDismiss={() => setNotice("")}
          duration={3000}
        >
          {notice}
        </Snackbar>
      }
    />
  );
}

function ReviewCard({
  review,
  canEdit,
  onEdit,
  onDelete,
  deleting,
}: {
  review: LocationReview;
  canEdit: boolean;
  onEdit: (review: LocationReview) => void;
  onDelete: (review: LocationReview) => void;
  deleting: boolean;
}) {
  const initials = getInitials(review.user?.fullName);
  const hasReply = Boolean(review.reply?.content);

  return (
    <Card mode="contained" style={styles.reviewCard}>
      <Card.Content>
        <View style={styles.reviewHeader}>
          <View style={styles.avatar}>
            {review.user?.avatarUrl ? (
              <Image
                source={{ uri: review.user.avatarUrl }}
                style={styles.avatarImage}
                alt={`${review.user.fullName || "Người dùng"} avatar`}
              />
            ) : (
              <Text style={styles.avatarText}>{initials}</Text>
            )}
          </View>
          <View style={styles.authorBlock}>
            <View style={styles.authorLine}>
              <Text variant="titleSmall" style={styles.authorName}>
                {review.user?.fullName || "Người dùng"}
              </Text>
              <Text variant="bodySmall" style={styles.dateText}>
                · {formatRelativeDate(review.createdAt)}
              </Text>
            </View>
            <StarRating rating={review.rating} size={13} />
          </View>
          {hasReply ? (
            <Chip compact icon="check" style={styles.repliedChip}>
              Đã trả lời
            </Chip>
          ) : null}
          {canEdit ? (
            <View style={styles.reviewActions}>
              <Button
                compact
                mode="text"
                icon="pencil"
                onPress={() => onEdit(review)}
                style={styles.reviewActionButton}
              >
                Sửa
              </Button>
              <Button
                compact
                mode="text"
                icon="delete-outline"
                loading={deleting}
                disabled={deleting}
                onPress={() => onDelete(review)}
                textColor="#B3261E"
                style={styles.reviewActionButton}
              >
                Xóa
              </Button>
            </View>
          ) : null}
        </View>

        <Text variant="bodyMedium" style={styles.commentText}>
          {review.comment}
        </Text>

        {review.images?.length ? (
          <View style={styles.imageRow}>
            {review.images.slice(0, 3).map((image) => (
              <Image
                key={image.url}
                source={{ uri: image.url }}
                style={styles.reviewImage}
                alt="Ảnh đánh giá"
              />
            ))}
          </View>
        ) : null}

        {hasReply ? (
          <View style={styles.replyBox}>
            <Text variant="labelMedium" style={styles.replyLabel}>
              Chủ địa điểm đã trả lời
            </Text>
            <Text variant="bodySmall" style={styles.replyText}>
              {review.reply?.content}
            </Text>
          </View>
        ) : null}
      </Card.Content>
    </Card>
  );
}

function StarRating({ rating, size = 15 }: { rating: number; size?: number }) {
  return (
    <View style={styles.stars}>
      {Array.from({ length: 5 }).map((_, index) => (
        <Icon
          key={index}
          source="star"
          size={size}
          color={index < Math.round(rating || 0) ? "#F5A400" : "#D7D2CA"}
        />
      ))}
    </View>
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
    <View style={styles.pressableStars}>
      {Array.from({ length: 5 }).map((_, index) => {
        const value = index + 1;
        return (
          <Pressable
            key={value}
            onPress={() => onChange(value)}
            hitSlop={8}
            style={styles.starButton}
          >
            <Icon
              source="star"
              size={28}
              color={value <= rating ? "#F5A400" : "#D7D2CA"}
            />
          </Pressable>
        );
      })}
    </View>
  );
}

function getInitials(name?: string) {
  if (!name?.trim()) {
    return "U";
  }

  return name
    .trim()
    .split(/\s+/)
    .slice(-2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function formatRelativeDate(value?: string) {
  if (!value) {
    return "";
  }

  const createdAt = new Date(value).getTime();
  const diffMs = Date.now() - createdAt;
  const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

  if (diffDays <= 0) {
    return "hôm nay";
  }
  if (diffDays < 7) {
    return `${diffDays} ngày trước`;
  }
  if (diffDays < 30) {
    return `${Math.floor(diffDays / 7)} tuần trước`;
  }
  if (diffDays < 365) {
    return `${Math.floor(diffDays / 30)} tháng trước`;
  }

  return `${Math.floor(diffDays / 365)} năm trước`;
}

const styles = StyleSheet.create({
  container: {
    gap: 12,
  },
  centerState: {
    minHeight: 160,
    alignItems: "center",
    justifyContent: "center",
  },
  summaryCard: {
    borderRadius: 8,
    backgroundColor: "#FFFDF9",
  },
  summaryContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
  },
  ratingText: {
    fontWeight: "800",
    color: "#1D1A16",
    lineHeight: 48,
  },
  summaryMeta: {
    flex: 1,
  },
  reviewCount: {
    fontWeight: "700",
    color: "#2D2923",
  },
  supportText: {
    color: "#6F675E",
    marginTop: 2,
  },
  stars: {
    flexDirection: "row",
    alignItems: "center",
    gap: 1,
  },
  errorText: {
    color: "#B3261E",
  },
  formCard: {
    borderRadius: 8,
    backgroundColor: "#FFFDF9",
  },
  formTitle: {
    fontWeight: "700",
    color: "#28231E",
  },
  pressableStars: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 10,
  },
  starButton: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
  },
  commentInput: {
    marginTop: 10,
    backgroundColor: "#FFFFFF",
  },
  formActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
  },
  cancelButton: {
    borderRadius: 8,
  },
  submitButton: {
    borderRadius: 8,
  },
  emptyCard: {
    borderRadius: 8,
    backgroundColor: "#FFFDF9",
  },
  emptyTitle: {
    textAlign: "center",
    color: "#635D54",
  },
  reviewCard: {
    borderRadius: 8,
    backgroundColor: "#FFFDF9",
  },
  reviewHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#F45110",
    overflow: "hidden",
  },
  avatarImage: {
    width: 36,
    height: 36,
  },
  avatarText: {
    color: "#FFFFFF",
    fontWeight: "800",
  },
  authorBlock: {
    flex: 1,
    minWidth: 0,
  },
  authorLine: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
  },
  authorName: {
    fontWeight: "700",
    color: "#28231E",
  },
  dateText: {
    color: "#766D63",
  },
  repliedChip: {
    height: 30,
    backgroundColor: "#D9F3DF",
  },
  reviewActions: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    maxWidth: 140,
  },
  reviewActionButton: {
    marginLeft: -4,
  },
  commentText: {
    marginTop: 12,
    color: "#403A34",
    lineHeight: 20,
  },
  imageRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 12,
  },
  reviewImage: {
    width: 76,
    height: 76,
    borderRadius: 8,
    backgroundColor: "#EFEAE3",
  },
  replyBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: "#F45110",
    backgroundColor: "#FFF1EB",
  },
  replyLabel: {
    color: "#D43B06",
    fontWeight: "800",
    marginBottom: 2,
  },
  replyText: {
    color: "#514942",
  },
});
