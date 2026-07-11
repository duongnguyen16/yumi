import {
  getDashboardOverview,
  getLocationStats,
  type VendorDashboardOverview,
  type VendorLocation,
} from '@/service/vendorService';
import { userContext } from '@/contexts/userContext';
import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import {
  Button,
  Chip,
  Divider,
  Snackbar,
  Text,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';

const appColors = {
  background: '#f7f5ef',
  surface: '#fffdf9',
  primary: '#ff4b22',
  text: '#25221e',
  muted: '#7a736b',
  success: '#16833a',
  successContainer: '#d8f2df',
  outline: '#e5ddd4',
};

function StatCard({
  value,
  label,
  color,
}: {
  value: string;
  label: string;
  color?: string;
}) {
  return (
    <View style={styles.statCard}>
      <Text
        style={[styles.statValue, { color: color || appColors.primary }]}
      >
        {value}
      </Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

export default function VendorDashboard() {
  const router = useRouter();
  const { user } = useContext(userContext);
  const [overview, setOverview] = useState<VendorDashboardOverview | null>(null);
  const [locations, setLocations] = useState<VendorLocation[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [days, setDays] = useState<number | undefined>(undefined);
  const [message, setMessage] = useState('');

  const fetchData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setMessage('');

    try {
      const [overviewRes, statsRes] = await Promise.all([
        getDashboardOverview(),
        getLocationStats(days),
      ]);

      if (overviewRes.success && overviewRes.data) {
        setOverview(overviewRes.data);
      } else {
        setMessage(overviewRes.message || 'Không thể tải tổng quan');
      }

      if (statsRes.success && statsRes.data) {
        setLocations(statsRes.data);
      } else {
        setMessage(statsRes.message || 'Không thể tải thống kê');
      }
    } catch {
      setMessage('Có lỗi xảy ra khi tải dữ liệu');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [days]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilterChange = (newDays: number | undefined) => {
    setDays(newDays);
  };

  if (!user) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <Text>Vui lòng đăng nhập để xem dashboard</Text>
          <Button
            mode="contained"
            onPress={() => router.replace('/auth/login')}
            style={{ marginTop: 12 }}
          >
            Đăng nhập
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Stack.Screen options={{ headerShown: false }} />

      <View style={styles.header}>
        <Text variant="headlineSmall" style={styles.title}>
          Dashboard
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => fetchData(true)}
          />
        }
      >
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={appColors.primary} />
            <Text style={{ marginTop: 12, color: appColors.muted }}>
              Đang tải dữ liệu...
            </Text>
          </View>
        ) : (
          <>
            {/* Summary cards */}
            <View style={styles.statsRow}>
              <StatCard
                value={overview?.totalLocations?.toLocaleString() ?? '0'}
                label="Địa điểm"
              />
              <StatCard
                value={overview?.totalViews?.toLocaleString() ?? '0'}
                label="Lượt xem"
              />
              <StatCard
                value={overview?.totalReviews?.toLocaleString() ?? '0'}
                label="Đánh giá"
              />
              <StatCard
                value={
                  overview?.avgRating
                    ? overview.avgRating.toFixed(1)
                    : '0.0'
                }
                label="Điểm TB"
                color="#2e7d32"
              />
            </View>

            {/* Filter chips */}
            <View style={styles.filterRow}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Thống kê theo địa điểm
              </Text>
              <View style={styles.chipGroup}>
                <Chip
                  mode={days === undefined ? 'flat' : 'outlined'}
                  selected={days === undefined}
                  onPress={() => handleFilterChange(undefined)}
                  style={styles.chip}
                  textStyle={styles.chipText}
                  compact
                >
                  Tất cả
                </Chip>
                <Chip
                  mode={days === 7 ? 'flat' : 'outlined'}
                  selected={days === 7}
                  onPress={() => handleFilterChange(7)}
                  style={styles.chip}
                  textStyle={styles.chipText}
                  compact
                >
                  7 ngày
                </Chip>
                <Chip
                  mode={days === 30 ? 'flat' : 'outlined'}
                  selected={days === 30}
                  onPress={() => handleFilterChange(30)}
                  style={styles.chip}
                  textStyle={styles.chipText}
                  compact
                >
                  30 ngày
                </Chip>
              </View>
            </View>

            {/* Location list */}
            {locations.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>
                  Chưa có địa điểm nào
                </Text>
                <Text style={styles.emptySubtitle}>
                  Bạn chưa sở hữu địa điểm nào. Hãy đăng ký địa điểm mới để
                  bắt đầu.
                </Text>
                <Button
                  mode="contained"
                  onPress={() => {
                    /* navigate to register location */
                  }}
                  style={{ marginTop: 12 }}
                >
                  Đăng ký địa điểm
                </Button>
              </View>
            ) : (
              <View style={styles.locationList}>
                {locations.map((loc, index) => (
                  <View key={loc._id}>
                    <View style={styles.locationCard}>
                      <View style={styles.locationHeader}>
                        <Text
                          style={styles.locationName}
                          numberOfLines={1}
                        >
                          {loc.name}
                        </Text>
                        <Text
                          style={styles.locationAddress}
                          numberOfLines={1}
                        >
                          {loc.address}
                        </Text>
                      </View>
                      <Divider style={{ marginVertical: 10 }} />
                      <View style={styles.locationStats}>
                        <View style={styles.locationStat}>
                          <Text style={styles.locationStatValue}>
                            {loc.viewCount.toLocaleString()}
                          </Text>
                          <Text style={styles.locationStatLabel}>
                            Lượt xem
                          </Text>
                        </View>
                        <View style={styles.locationStat}>
                          <Text style={styles.locationStatValue}>
                            {loc.reviewCount}
                          </Text>
                          <Text style={styles.locationStatLabel}>
                            Đánh giá
                          </Text>
                        </View>
                        <View style={styles.locationStat}>
                          <Text
                            style={[
                              styles.locationStatValue,
                              {
                                color:
                                  loc.avgRating >= 4
                                    ? appColors.success
                                    : appColors.text,
                              },
                            ]}
                          >
                            {loc.avgRating.toFixed(1)}
                          </Text>
                          <Text style={styles.locationStatLabel}>
                            Điểm TB
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      <Snackbar
        visible={!!message}
        onDismiss={() => setMessage('')}
        duration={4000}
      >
        {message}
      </Snackbar>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: appColors.background,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  header: {
    height: 58,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#ece8df',
  },
  title: {
    fontWeight: '800',
    color: '#24211d',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  statsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    minHeight: 66,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
    paddingVertical: 12,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '900',
  },
  statLabel: {
    color: '#7e786f',
    fontSize: 11,
    fontWeight: '700',
    marginTop: 2,
  },
  filterRow: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: '800',
    color: '#24211d',
    marginBottom: 8,
  },
  chipGroup: {
    flexDirection: 'row',
    gap: 8,
  },
  chip: {
    height: 32,
    borderRadius: 16,
  },
  chipText: {
    fontSize: 12,
  },
  locationList: {
    gap: 10,
  },
  locationCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 2 },
    elevation: 1,
  },
  locationHeader: {
    gap: 4,
  },
  locationName: {
    fontSize: 15,
    fontWeight: '800',
    color: '#24211d',
  },
  locationAddress: {
    fontSize: 13,
    color: '#7e786f',
  },
  locationStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  locationStat: {
    alignItems: 'center',
    gap: 2,
  },
  locationStatValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#24211d',
  },
  locationStatLabel: {
    fontSize: 11,
    color: '#7e786f',
    fontWeight: '600',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '800',
    color: '#24211d',
    marginBottom: 6,
  },
  emptySubtitle: {
    fontSize: 13,
    color: '#7e786f',
    textAlign: 'center',
    lineHeight: 20,
  },
});
