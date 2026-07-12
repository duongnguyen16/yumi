import { userContext } from "@/contexts/userContext";
import {
  createProduct,
  deleteProduct,
  updateProduct,
  type ProductPayload,
} from "@/service/productService";
import React, { useContext, useMemo, useState } from "react";
import { Alert, Modal, StyleSheet, View } from "react-native";
import {
  Button,
  Card,
  Divider,
  IconButton,
  Snackbar,
  Text,
  TextInput,
} from "react-native-paper";

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

const emptyForm = {
  name: "",
  description: "",
  imageUrl: "",
  price: "",
};

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

  const ownerValue = getId(ownerId);
  const userId = getId(user);
  const canManage =
    user?.role === "VENDOR" && !!ownerValue && !!userId && ownerValue === userId;

  const sortedProducts = useMemo(() => products ?? [], [products]);

  const openCreate = () => {
    setEditingProduct(null);
    setForm(emptyForm);
    setModalVisible(true);
  };

  const openEdit = (product: Product) => {
    setEditingProduct(product);
    setForm({
      name: product.name ?? "",
      description: product.description ?? "",
      imageUrl: product.imageUrl ?? "",
      price:
        product.price !== undefined && product.price !== null
          ? String(product.price)
          : "",
    });
    setModalVisible(true);
  };

  const saveProduct = async () => {
    if (!locationId) {
      setMessage("Không tìm thấy địa điểm.");
      return;
    }
    if (!form.name.trim()) {
      setMessage("Tên sản phẩm không được để trống.");
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
      imageUrl: form.imageUrl.trim() || undefined,
      price: parsedPrice,
    };

    setSaving(true);
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
    setSaving(false);
  };

  const confirmDelete = (product: Product) => {
    const productId = getId(product);
    if (!productId) {
      return;
    }

    Alert.alert("Xóa sản phẩm", "Bạn có chắc muốn xóa sản phẩm này?", [
      { text: "Hủy", style: "cancel" },
      {
        text: "Xóa",
        style: "destructive",
        onPress: async () => {
          const response = await deleteProduct(productId);
          if (response?.success) {
            setMessage("Đã xóa sản phẩm.");
            await onChanged?.();
          } else {
            setMessage(response?.message || "Không thể xóa sản phẩm.");
          }
        },
      },
    ]);
  };

  return (
    <Card style={styles.card}>
      <Card.Title
        title="Sản phẩm"
        subtitle="Giá chỉ mang tính tham khảo"
        right={() =>
          canManage ? (
            <IconButton
              icon="plus"
              mode="contained-tonal"
              onPress={openCreate}
              disabled={sortedProducts.length >= 50}
            />
          ) : null
        }
      />
      <Card.Content>
        {sortedProducts.length === 0 ? (
          <Text style={styles.empty}>Chưa có sản phẩm.</Text>
        ) : (
          sortedProducts.map((product, index) => (
            <View key={getId(product) ?? product.name ?? index}>
              {index > 0 && <Divider style={styles.divider} />}
              <View style={styles.productRow}>
                <View style={styles.productInfo}>
                  <Text variant="titleMedium" style={styles.productName}>
                    {product.name}
                  </Text>
                  {!!product.description && (
                    <Text style={styles.description}>{product.description}</Text>
                  )}
                  {product.price !== undefined && product.price !== null ? (
                    <>
                      <Text style={styles.price}>
                        {formatPrice(product.price)}
                      </Text>
                      <Text style={styles.disclaimer}>
                        {product.priceDisclaimer ||
                          "Reference price only. Please confirm with the vendor before buying."}
                      </Text>
                    </>
                  ) : (
                    <Text style={styles.noPrice}>Chưa có giá</Text>
                  )}
                </View>
                {canManage && (
                  <View style={styles.productActions}>
                    <IconButton icon="pencil" onPress={() => openEdit(product)} />
                    <IconButton
                      icon="delete-outline"
                      iconColor="#C2410C"
                      onPress={() => confirmDelete(product)}
                    />
                  </View>
                )}
              </View>
            </View>
          ))
        )}
        {canManage && sortedProducts.length >= 50 && (
          <Text style={styles.limit}>Đã đạt giới hạn 50 sản phẩm.</Text>
        )}
      </Card.Content>

      <Modal
        transparent
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.sheet}>
            <Text variant="titleLarge" style={styles.sheetTitle}>
              {editingProduct ? "Sửa sản phẩm" : "Thêm sản phẩm"}
            </Text>
            <TextInput
              label="Tên sản phẩm"
              mode="outlined"
              value={form.name}
              onChangeText={(name) => setForm((current) => ({ ...current, name }))}
            />
            <TextInput
              label="Mô tả"
              mode="outlined"
              value={form.description}
              multiline
              onChangeText={(description) =>
                setForm((current) => ({ ...current, description }))
              }
            />
            <TextInput
              label="Giá tham khảo"
              mode="outlined"
              value={form.price}
              keyboardType="numeric"
              onChangeText={(price) =>
                setForm((current) => ({ ...current, price }))
              }
            />
            <TextInput
              label="URL hình ảnh"
              mode="outlined"
              value={form.imageUrl}
              onChangeText={(imageUrl) =>
                setForm((current) => ({ ...current, imageUrl }))
              }
            />
            <Text style={styles.formNote}>
              Không tạo giỏ hàng hoặc thanh toán trong ứng dụng.
            </Text>
            <View style={styles.sheetActions}>
              <Button mode="outlined" onPress={() => setModalVisible(false)}>
                Hủy
              </Button>
              <Button mode="contained" loading={saving} onPress={saveProduct}>
                Lưu
              </Button>
            </View>
          </View>
        </View>
      </Modal>

      <Snackbar visible={!!message} onDismiss={() => setMessage("")}>
        {message}
      </Snackbar>
    </Card>
  );
}

function getId(value: unknown) {
  if (!value) {
    return "";
  }
  if (typeof value === "string") {
    return value;
  }
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

const styles = StyleSheet.create({
  card: {
    padding: 16,
    marginTop: 16,
  },
  empty: {
    color: "#6B7280",
  },
  divider: {
    marginVertical: 12,
  },
  productRow: {
    flexDirection: "row",
    gap: 8,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontWeight: "700",
  },
  description: {
    marginTop: 4,
    color: "#4B5563",
  },
  price: {
    marginTop: 8,
    fontWeight: "800",
    color: "#166534",
  },
  disclaimer: {
    marginTop: 2,
    color: "#6B7280",
    fontSize: 12,
  },
  noPrice: {
    marginTop: 8,
    color: "#6B7280",
  },
  productActions: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  limit: {
    marginTop: 12,
    color: "#C2410C",
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  sheet: {
    gap: 12,
    padding: 18,
    paddingBottom: 26,
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    backgroundColor: "#fff",
  },
  sheetTitle: {
    fontWeight: "800",
  },
  formNote: {
    color: "#6B7280",
    fontSize: 12,
  },
  sheetActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
});
