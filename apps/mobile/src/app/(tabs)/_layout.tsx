import { Tabs } from "expo-router";
import AntDesign from "@expo/vector-icons/AntDesign";
import Feather from "@expo/vector-icons/Feather";

export default function TabsLayout() {
  return (
    <Tabs>
      <Tabs.Screen
        name="home"
        options={{
          tabBarIcon: (color) => (
            <AntDesign name="home" size={24} color={color.color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: (color) => (
            <Feather name="user" size={24} color={color.color} />
          ),
        }}
      />
    </Tabs>
  );
}
