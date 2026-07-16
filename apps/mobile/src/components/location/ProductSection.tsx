import { locationProductsExpandedByDefault } from "@/common/map-location";
import { userContext } from "@/contexts/userContext";
import {
  createProduct,
  deleteProduct,
  updateProduct,
  type ProductPayload,
} from "@/service/productService";
import { toAbsoluteUrl } from "@/service/url";
import {
  AppText,
  Button,
  Card,
  EmptyState,
  IconButton,
  Inline,
  NoticeSnackbar,
  Stack,
  TextArea,
  TextField,
} from "@/ui/components";
import { colors, radius, spacing } from "@/ui/tokens";
import * as ImagePicker from "expo-image-picker";
import React, { useContext, useMemo, useState } from "react";
import { Alert, Image, View } from "react-native";
import { Modal, Portal } from "react-native-paper";

type Product = {
  _id?: string;
  id?: string;
  name?: string;
  description?: string | null;
  imageUrl?: string | null;
  price?: number | null;
  priceDisclaimer?: string;
};

type ProductSectionProps = {
  locationId?: string;
  ownerId?: string | { _id?: string; id?: string } | null;
  products?: Product[];
  onChanged?: () => Promise<void> | void;
};

const emptyForm = { name: "", description: "", price: "" };
const supportedImageTypes = ["image/jpeg", "image/jpg", "image/png"];
const maxProductImageSize = 5 * 1024 * 1024;

export default function ProductSection({
  locationId,
  ownerId,
  products = [],
  onChanged,
}: ProductSectionProps) {
  const { user } = useContext(userContext);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [modalVisible, setModalVisible] = useState(false);
  const [expanded, setExpanded] = useState(locationProductsExpandedByDefault);
  const [pickedImage, setPickedImage] =
    useState<ImagePicker.ImagePickerAsset | null>(null);
  const [removeImage, setRemoveImage] = useState(false);

  const canManage =
    user?.role === "VENDOR" &&
    Boolean(getId(ownerId)) &&
    getId(ownerId) === getId(user);
  const sortedProducts = useMemo(() => products ?? [], [products]);

  const openCreate = () => {
    setEditingProduct(null);
    setForm(emptyForm);
    setPickedImage(null);
    setRemoveImage(false);
    setModalVisible(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name ?? "",
      description: product.description ?? "",
      price: product.price == null ? "" : String(product.price),
    });
    setPickedImage(null);
    setRemoveImage(false);
    setModalVisible(true);
  };

  const pickProductImage = async () => {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      setMessage("Cần cấp quyền truy cập ảnh để chọn ảnh sản phẩm.");
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [4, 3],
      quality: 0.8,
    });
    if (result.canceled) return;

    const image = result.assets[0];
    const mimeType = image.mimeType ?? "image/jpeg";
    if (!supportedImageTypes.includes(mimeType)) {
      setMessage("Chỉ hỗ trợ ảnh JPG, JPEG hoặc PNG.");
      return;
    }
    if (image.fileSize && image.fileSize > maxProductImageSize) {
      setMessage("Ảnh sản phẩm phải nhỏ hơn hoặc bằng 5MB.");
      return;
    }

    setPickedImage(image);
    setRemoveImage(false);
  };

  const saveProduct = async () => {
    if (!locationId || !form.name.trim()) {
      setMessage(
        !locationId ? "Không tìm thấy địa điểm." : "Tên sản phẩm không được để trống.",
      );
      return;
    }

    const price = form.price.trim();
    const parsedPrice = price ? Number(price) : null;
    if (price && (!Number.isFinite(parsedPrice) || parsedPrice < 0)) {
      setMessage("Giá phải là số không âm.");
      return;
    }

    const payload: ProductPayload = {
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      price: parsedPrice,
      image: pickedImage
        ? {
            uri: pickedImage.uri,
            name:
              pickedImage.fileName ??
              `product-${Date.now()}.${pickedImage.mimeType === "image/png" ? "png" : "jpg"}`,
            type: pickedImage.mimeType ?? "image/jpeg",
          }
        : undefined,
      removeImage: editingProduct ? removeImage : undefined,
    };

    setSaving(true);
    try {
      const productId = getId(editingProduct);
      const response = productId
        ? await updateProduct(productId, payload)
        : await createProduct(locationId, payload);
      if (response?.success) {
        setModalVisible(false);
        setMessage(productId ? "Đã cập nhật sản phẩm." : "Đã tạo sản phẩm.");
        await onChanged?.();
      } else {
        setMessage(response?.message || "Không thể lưu sản phẩm.");
      }
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = (product: Product) => {
    const productId = getId(product);
    if (!productId) return;

    Alert.alert("Xóa sản phẩm", "Bạn có chắc muốn xóa sản phẩm này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          const response = await deleteProduct(productId);
          setMessage(
            response?.success
              ? "Đã xóa sản phẩm."
              : response?.message || "Không thể xóa sản phẩm.",
          );
          if (response?.success) await onChanged?.();
        },
      },
    ]);
  };

  return (
    <Stack>
      <Inline style={{ justifyContent: "space-between" }}>
        <Stack gap={spacing[1]} style={{ flex: 1 }}>
          <AppText variant="title2">Sản phẩm</AppText>
          <AppText style={{ color: colors.textSecondary }} variant="caption">
            Giá chỉ mang tính tham khảo
          </AppText>
        </Stack>
        <Inline>
          {canManage && sortedProducts.length < 50 ? (
            <IconButton icon="plus" label="Thêm sản phẩm" onPress={openCreate} />
          ) : null}
          <IconButton
            icon={expanded ? "chevron-up" : "chevron-down"}
            label={expanded ? "Thu gọn sản phẩm" : "Mở rộng sản phẩm"}
            onPress={() => setExpanded((current) => !current)}
          />
        </Inline>
      </Inline>

      {expanded &&
        (sortedProducts.length === 0 ? (
          <EmptyState icon="shopping-outline" title="Chưa có sản phẩm" />
        ) : (
          sortedProducts.map((product, index) => (
            <Card key={getId(product) || product.name || index}>
              <Stack>
                {renderProductImage(product.imageUrl)}
                <Inline style={{ alignItems: "flex-start" }}>
                  <Stack gap={spacing[1]} style={{ flex: 1 }}>
                    <AppText variant="headline">{product.name}</AppText>
                    {product.description ? (
                      <AppText style={{ color: colors.textSecondary }} variant="subhead">
                        {product.description}
                      </AppText>
                    ) : null}
                    <AppText
                      style={{
                        color:
                          product.price == null
                            ? colors.textSecondary
                            : colors.accentGreen,
                      }}
                      variant="headline"
                    >
                      {product.price == null ? "Chưa có giá" : formatPrice(product.price)}
                    </AppText>
                    {product.price != null ? (
                      <AppText style={{ color: colors.textTertiary }} variant="caption">
                        {product.priceDisclaimer ||
                          "Giá tham khảo. Vui lòng xác nhận với người bán."}
                      </AppText>
                    ) : null}
                  </Stack>
                  {canManage ? (
                    <Inline>
                      <IconButton
                        icon="pencil-outline"
                        label="Sửa sản phẩm"
                        onPress={() => openEdit(product)}
                      />
                      <IconButton
                        icon="delete-outline"
                        label="Xóa sản phẩm"
                        onPress={() => confirmDelete(product)}
                      />
                    </Inline>
                  ) : null}
                </Inline>
              </Stack>
            </Card>
          ))
        ))}

      {expanded && canManage && sortedProducts.length >= 50 ? (
        <AppText style={{ color: colors.accentRed }} variant="caption">
          Đã đạt giới hạn 50 sản phẩm.
        </AppText>
      ) : null}

      <Portal>
        <Modal
          contentContainerStyle={{
            backgroundColor: colors.surfaceBase,
            borderRadius: radius.sheet,
            gap: spacing[3],
            marginHorizontal: spacing[4],
            padding: spacing[5],
          }}
          onDismiss={() => setModalVisible(false)}
          visible={modalVisible}
        >
          <AppText variant="title2">
            {editingProduct ? "Sửa sản phẩm" : "Thêm sản phẩm"}
          </AppText>
          <TextField
            label="Tên sản phẩm"
            onChangeText={(name) => setForm((current) => ({ ...current, name }))}
            value={form.name}
          />
          <TextArea
            label="Mô tả"
            onChangeText={(description) =>
              setForm((current) => ({ ...current, description }))
            }
            value={form.description}
          />
          <TextField
            keyboardType="numeric"
            label="Giá tham khảo"
            onChangeText={(price) => setForm((current) => ({ ...current, price }))}
            value={form.price}
          />
          {pickedImage
            ? renderProductImage(pickedImage.uri, true)
            : !removeImage && renderProductImage(editingProduct?.imageUrl)}
          <View style={{ flexDirection: "row", gap: spacing[2] }}>
            <Button
              icon="image-outline"
              label={pickedImage || editingProduct?.imageUrl ? "Thay ảnh" : "Chọn ảnh"}
              onPress={() => void pickProductImage()}
              variant="secondary"
            />
            {(pickedImage || (!removeImage && editingProduct?.imageUrl)) && (
              <Button
                label="Xóa ảnh"
                onPress={() => {
                  setPickedImage(null);
                  setRemoveImage(Boolean(editingProduct?.imageUrl));
                }}
                variant="destructive"
              />
            )}
          </View>
          <AppText style={{ color: colors.textSecondary }} variant="caption">
            Không tạo giỏ hàng hoặc thanh toán trong ứng dụng.
          </AppText>
          <Inline style={{ justifyContent: "flex-end" }}>
            <Button
              label="Hủy"
              onPress={() => setModalVisible(false)}
              variant="secondary"
            />
            <Button label="Lưu" loading={saving} onPress={() => void saveProduct()} />
          </Inline>
        </Modal>
      </Portal>
      <NoticeSnackbar message={message} onDismiss={() => setMessage("")} />
    </Stack>
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

function formatPrice(price: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(price);
}

function renderProductImage(imageUrl?: string | null, local = false) {
  const normalizedUrl = local ? imageUrl : toAbsoluteUrl(imageUrl?.trim());
  if (!normalizedUrl) return null;

  return (
    <Image
      accessibilityLabel="Ảnh sản phẩm"
      alt="Ảnh sản phẩm"
      resizeMode="cover"
      source={{ uri: normalizedUrl }}
      style={{
        backgroundColor: colors.surfaceMedia,
        borderRadius: radius.large,
        height: 160,
        width: "100%",
      }}
    />
  );
}
