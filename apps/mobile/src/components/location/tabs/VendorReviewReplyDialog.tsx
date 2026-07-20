import type { LocationReview } from "@/service/reviewService";
import { toAbsoluteUrl } from "@/service/url";
import {
  AppText,
  Button,
  IconButton,
  Inline,
  Stack,
  TextArea,
} from "@/ui/components";
import { colors, fontFamily, radius, spacing } from "@/ui/tokens";
import { Image } from "expo-image";
import React, { useState } from "react";
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { Avatar, Icon, Menu, Modal, Portal, Surface } from "react-native-paper";
import { ImagePreviewModal } from "../ImagePreviewModal";
import { getReviewComposerKeyboardBehavior } from "./review-composer-keyboard";
import {
  getReviewReplyDialogMode,
  getReviewReplyDialogVisibility,
} from "./review-reply-model";

type VendorReviewReplyDialogProps = {
  draft: string;
  editing: boolean;
  review: LocationReview | null;
  saving: boolean;
  visible: boolean;
  onCancelEdit: () => void;
  onChangeDraft: (value: string) => void;
  onDismiss: () => void;
  onStartEdit: () => void;
  onSubmit: () => void;
};

export function VendorReviewReplyDialog({
  draft,
  editing,
  review,
  saving,
  visible,
  onCancelEdit,
  onChangeDraft,
  onDismiss,
  onStartEdit,
  onSubmit,
}: VendorReviewReplyDialogProps) {
  const [menuVisible, setMenuVisible] = useState(false);
  const [previewIndex, setPreviewIndex] = useState<number | null>(null);
  const hasReply = Boolean(review?.reply?.content);
  const mode = getReviewReplyDialogMode(hasReply, editing);
  const visibility = getReviewReplyDialogVisibility(mode);

  if (!review) return null;

  const reviewerName = review.user?.fullName?.trim() || "Người dùng";
  const avatarUrl = toAbsoluteUrl(review.user?.avatarUrl);
  const avatarInitial = reviewerName.slice(0, 1).toUpperCase();
  const imageUrls = getReviewImageUrls(review)
    .map((url) => toAbsoluteUrl(url))
    .filter((url): url is string => Boolean(url));
  const previewImages = imageUrls.map((url, index) => ({
    description: `Ảnh đánh giá ${index + 1}`,
    title: reviewerName,
    url,
  }));

  const dismiss = () => {
    if (saving) return;
    Keyboard.dismiss();
    setMenuVisible(false);
    onDismiss();
  };

  const startEdit = () => {
    setMenuVisible(false);
    onStartEdit();
  };

  return (
    <Portal>
      <KeyboardAvoidingView
        behavior={getReviewComposerKeyboardBehavior(Platform.OS)}
        pointerEvents="box-none"
        style={{ flex: 1 }}
      >
        <Modal dismissable={!saving} onDismiss={dismiss} visible={visible}>
          <Surface
            elevation={2}
            style={{
              alignSelf: "center",
              backgroundColor: colors.surfaceRaised,
              borderRadius: radius.large,
              maxHeight: "82%",
              padding: spacing[4],
              width: "92%",
            }}
          >
            <Inline style={{ justifyContent: "space-between" }}>
              <AppText variant="title2">Phản hồi đánh giá</AppText>
              <IconButton icon="close" label="Đóng" onPress={dismiss} />
            </Inline>

            <ScrollView
              contentContainerStyle={{ gap: spacing[3], paddingTop: spacing[2] }}
              keyboardDismissMode="interactive"
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <Inline style={{ alignItems: "flex-start" }}>
                {avatarUrl ? (
                  <Avatar.Image
                    accessibilityLabel={`Ảnh đại diện của ${reviewerName}`}
                    size={40}
                    source={{ uri: avatarUrl }}
                  />
                ) : (
                  <Avatar.Text
                    accessibilityLabel={`Ảnh đại diện của ${reviewerName}`}
                    color={colors.textInverse}
                    label={avatarInitial}
                    labelStyle={{ fontFamily: fontFamily.bold }}
                    size={40}
                    style={{ backgroundColor: colors.accentPrimary }}
                  />
                )}
                <Stack gap={spacing[1]} style={{ flex: 1 }}>
                  <Inline gap={spacing[1]}>
                    <AppText numberOfLines={1} variant="headline">
                      {reviewerName}
                    </AppText>
                    <AppText
                      style={{ color: colors.textTertiary }}
                      variant="caption"
                    >
                      {formatRelativeDate(review.createdAt)}
                    </AppText>
                  </Inline>
                  <Inline gap={1}>
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Icon
                        color={
                          index < Math.round(review.rating || 0)
                            ? colors.accentOrange
                            : colors.borderStrong
                        }
                        key={index}
                        size={15}
                        source="star"
                      />
                    ))}
                  </Inline>
                  <AppText variant="body">{review.comment}</AppText>
                </Stack>
              </Inline>

              {imageUrls.length ? (
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <Inline>
                    {imageUrls.map((url, index) => (
                      <Pressable
                        accessibilityLabel="Xem ảnh trong đánh giá"
                        accessibilityRole="imagebutton"
                        key={url}
                        onPress={() => setPreviewIndex(index)}
                        style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}
                      >
                      <Image
                        alt="Ảnh trong đánh giá"
                        contentFit="cover"
                        source={{ uri: url }}
                        style={{
                          backgroundColor: colors.surfaceMedia,
                          borderRadius: radius.medium,
                          height: 88,
                          width: 88,
                        }}
                      />
                      </Pressable>
                    ))}
                  </Inline>
                </ScrollView>
              ) : null}

              <View
                style={{
                  borderLeftColor: colors.borderSubtle,
                  borderLeftWidth: 2,
                  marginLeft: spacing[4],
                  paddingLeft: spacing[4],
                }}
              >
                {visibility.showReadReply && review.reply ? (
                  <Stack gap={spacing[2]}>
                    <Inline style={{ justifyContent: "space-between" }}>
                      <Stack gap={spacing[1]} style={{ flex: 1 }}>
                        <AppText variant="headline">
                          Phản hồi của chủ địa điểm
                        </AppText>
                        {review.reply.createdAt ? (
                          <AppText
                            style={{ color: colors.textTertiary }}
                            variant="caption"
                          >
                            {formatRelativeDate(review.reply.createdAt)}
                          </AppText>
                        ) : null}
                      </Stack>
                      {visibility.showEditMenu ? (
                        <Menu
                          anchor={
                            <IconButton
                              icon="dots-vertical"
                              label="Tùy chọn phản hồi"
                              onPress={() => setMenuVisible(true)}
                            />
                          }
                          onDismiss={() => setMenuVisible(false)}
                          visible={menuVisible}
                        >
                          <Menu.Item
                            leadingIcon="pencil-outline"
                            onPress={startEdit}
                            title="Chỉnh sửa phản hồi"
                          />
                        </Menu>
                      ) : null}
                    </Inline>
                    <AppText variant="body">{review.reply.content}</AppText>
                  </Stack>
                ) : null}

                {visibility.showComposer ? (
                  <Stack gap={spacing[2]}>
                    <TextArea
                      autoFocus
                      disabled={saving}
                      label={
                        mode === "edit"
                          ? "Chỉnh sửa phản hồi"
                          : "Phản hồi của bạn"
                      }
                      maxLength={1000}
                      onChangeText={onChangeDraft}
                      value={draft}
                    />
                    <AppText
                      style={{ color: colors.textTertiary, textAlign: "right" }}
                      variant="caption"
                    >
                      {draft.length}/1000
                    </AppText>
                    <Inline style={{ justifyContent: "flex-end" }}>
                      <Button
                        disabled={saving}
                        label="Hủy"
                        onPress={mode === "edit" ? onCancelEdit : dismiss}
                        variant="tertiary"
                      />
                      <Button
                        disabled={saving}
                        icon={mode === "edit" ? "content-save" : "send"}
                        label={
                          mode === "edit" ? "Lưu thay đổi" : "Gửi phản hồi"
                        }
                        loading={saving}
                        onPress={onSubmit}
                      />
                    </Inline>
                  </Stack>
                ) : null}
              </View>
            </ScrollView>
          </Surface>
        </Modal>
      </KeyboardAvoidingView>
      <ImagePreviewModal
        images={previewImages}
        initialIndex={previewIndex ?? 0}
        locationName="Đánh giá"
        onDismiss={() => setPreviewIndex(null)}
        visible={previewIndex !== null}
      />
    </Portal>
  );
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
  const date = new Date(value);
  const diffDays = Math.max(
    0,
    Math.floor((Date.now() - date.getTime()) / 86_400_000),
  );
  if (diffDays === 0) return "Hôm nay";
  if (diffDays === 1) return "Hôm qua";
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return date.toLocaleDateString("vi-VN");
}
