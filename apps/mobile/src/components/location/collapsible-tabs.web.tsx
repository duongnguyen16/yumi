import React, { Children, isValidElement, useState, type ReactElement, type ReactNode } from "react";
import { FlatList, Pressable, ScrollView, Text, View, type FlatListProps, type ScrollViewProps, type StyleProp, type TextStyle, type ViewStyle } from "react-native";
import { colors, fontFamily } from "@/ui/tokens";

type TabProps = { name: string; label: ReactNode; children?: ReactNode };

type TabBarProps = {
  tabs: TabProps[];
  active: string;
  onTabPress: (name: string) => void;
  activeColor?: string;
  inactiveColor?: string;
  contentContainerStyle?: StyleProp<ViewStyle>;
  indicatorStyle?: StyleProp<ViewStyle>;
  labelStyle?: StyleProp<TextStyle>;
  scrollEnabled?: boolean;
  style?: StyleProp<ViewStyle>;
  tabStyle?: StyleProp<ViewStyle>;
};

function Container({ renderHeader, renderTabBar, children }: { renderHeader?: () => ReactNode; renderTabBar?: (props: TabBarProps) => ReactNode; children?: ReactNode }) {
  const tabs = Children.toArray(children).filter(isValidElement) as ReactElement<TabProps>[];
  const [active, setActive] = useState(tabs[0]?.props.name ?? "");
  const current = tabs.find((tab) => tab.props.name === active) ?? tabs[0];
  const barProps: TabBarProps = { active, onTabPress: setActive, tabs: tabs.map((tab) => tab.props) };
  return (
    <View style={{ flex: 1 }}>
      {renderHeader ? renderHeader() : null}
      {renderTabBar ? renderTabBar(barProps) : <MaterialTabBar {...barProps} />}
      <View style={{ flex: 1 }}>{current?.props.children}</View>
    </View>
  );
}

function Tab(_: TabProps) {
  return null;
}

function TabScrollView({ children, contentContainerStyle, style, ...rest }: ScrollViewProps) {
  return (
    <ScrollView contentContainerStyle={contentContainerStyle} style={[{ flex: 1 }, style]} {...rest}>
      {children}
    </ScrollView>
  );
}

function TabFlatList<T>(props: FlatListProps<T>) {
  return <FlatList style={{ flex: 1 }} {...props} />;
}

function MaterialTabBar({ tabs, active, onTabPress, activeColor, inactiveColor, contentContainerStyle, indicatorStyle, labelStyle, style, tabStyle }: TabBarProps) {
  return (
    <View style={[{ backgroundColor: colors.surfaceBase, flexDirection: "row" }, style]}>
      <View style={[{ flex: 1, flexDirection: "row" }, contentContainerStyle]}>
        {tabs.map((tab) => {
          const focused = tab.name === active;
          return (
            <Pressable key={tab.name} onPress={() => onTabPress(tab.name)} style={[{ alignItems: "center", flexGrow: 1, justifyContent: "center" }, tabStyle]}>
              <Text style={[{ color: focused ? (activeColor ?? colors.accentPrimary) : (inactiveColor ?? colors.textSecondary), fontFamily: fontFamily.semibold }, labelStyle]}>{tab.label}</Text>
              <View style={[{ alignSelf: "stretch", height: 2 }, focused ? [{ backgroundColor: activeColor ?? colors.accentPrimary }, indicatorStyle] : { backgroundColor: "transparent" }]} />
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export const Tabs = { Container, FlatList: TabFlatList, ScrollView: TabScrollView, Tab };
export { MaterialTabBar };
