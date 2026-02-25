import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '../../src/constants/theme';
import { Platform } from 'react-native';
import { BlurView } from 'expo-blur';

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function TabIcon({
  name,
  activeName,
  color,
  focused,
}: {
  name: IoniconsName;
  activeName: IoniconsName;
  color: string;
  focused: boolean;
}) {
  return <Ionicons name={focused ? activeName : name} size={24} color={color} />;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          position: 'absolute',
          backgroundColor: 'transparent',
          borderTopColor: 'rgba(255,255,255,0.08)',
          borderTopWidth: 0.5,
          height: Platform.OS === 'ios' ? 84 : 64,
          paddingBottom: Platform.OS === 'ios' ? 28 : 8,
          paddingTop: 8,
          elevation: 0,
        },
        tabBarBackground: () => (
          <BlurView
            intensity={60}
            tint="dark"
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              top: 0,
              bottom: 0,
              backgroundColor: 'rgba(10,10,10,0.75)',
            }}
          />
        ),
        tabBarActiveTintColor: Colors.tabActive,
        tabBarInactiveTintColor: Colors.tabInactive,
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: 2,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="home-outline" activeName="home" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="workout"
        options={{
          title: 'Workout',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="barbell-outline" activeName="barbell" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="time-outline" activeName="time" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="calories"
        options={{
          title: 'Calories',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="flame-outline" activeName="flame" color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, focused }) => (
            <TabIcon name="person-outline" activeName="person" color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}
