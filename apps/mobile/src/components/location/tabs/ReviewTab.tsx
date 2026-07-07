import {
  createReview,
  getReviewsByLocation,
  LocationReview,
  ReviewSummary,
} from "@/service/reviewService";
import * as Location from "expo-location";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, View } from "react-native";
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
  locationId?: string;
  initialRating?: Partial<ReviewSummary> | null;
};

export default function ReviewTab({
  locationId,
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

  const loadReviews = useCallback(async (options?: { showLoading?: boolean }) => {
    if (!locationId) {
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
  }, [locationId]);

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
    if (trimmedComment.length < 20) {
      setNotice("Nội dung đánh giá cần ít nhất 20 ký tự.");
      return;
    }

    setSubmitting(true);
    try {
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

  if (loading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
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

      <Card mode="contained" style={styles.formCard}>
        <Card.Content>
          <Text variant="titleMedium" style={styles.formTitle}>
            Viết đánh giá
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
          <Button
            mode="contained"
            icon="send"
            loading={submitting}
            disabled={submitting}
            onPress={handleSubmitReview}
            style={styles.submitButton}
          >
            Gửi đánh giá
          </Button>
        </Card.Content>
      </Card>

      {errorMessage ? (
        <Text style={styles.errorText}>{errorMessage}</Text>
      ) : null}

      {reviews.length === 0 ? (
        <Card mode="contained" style={styles.emptyCard}>
          <Card.Content>
            <Text variant="titleMedium" style={styles.emptyTitle}>
              Địa điểm này chưa có đánh giá
            </Text>
          </Card.Content>
        </Card>
      ) : (
        reviews.map((review) => <ReviewCard key={review.id} review={review} />)
      )}

      <Snackbar
        visible={Boolean(notice)}
        onDismiss={() => setNotice("")}
        duration={3000}
      >
        {notice}
      </Snackbar>
    </View>
  );
}

function ReviewCard({ review }: { review: LocationReview }) {
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
  submitButton: {
    alignSelf: "flex-end",
    marginTop: 12,
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
