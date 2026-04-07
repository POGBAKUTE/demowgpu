import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { useCallback } from 'react';

import { DrawerActions, useNavigation } from '@react-navigation/native';
import { Drawer } from 'expo-router/drawer';
import { PressableScale } from 'pressto';

import { AnimatedDrawerIcon } from '../src/navigation/components/animated-drawer-icon';

const baseDrawerOptions = {
  headerShown: true,
  headerTransparent: true,
  headerStyle: {
    backgroundColor: 'transparent',
  },
  title: 'Crossy Road',
  headerTintColor: 'white',
  headerTitleStyle: {
    color: 'white',
  },
};

export default function HomeScreen() {
  const { width: windowWidth } = useWindowDimensions();
  const navigation = useNavigation();

  const handleOpenDrawer = useCallback(() => {
    navigation.dispatch(DrawerActions.openDrawer());
  }, [navigation]);

  return (
    <>
      <Drawer.Screen
        options={{
          ...baseDrawerOptions,
          swipeEdgeWidth: windowWidth * 0.35,
          swipeEnabled: true,
          swipeMinDistance: 40,
          headerLeft: () => (
            <View style={{ paddingLeft: 16 }}>
              <AnimatedDrawerIcon />
            </View>
          ),
        }}
      />
      <View style={styles.container}>
        <Text style={styles.title}>Crossy Road Lite</Text>
        <Text style={styles.subtitle}>Open menu to start game</Text>
      </View>
      <PressableScale style={styles.floatingButton} onPress={handleOpenDrawer}>
        <View style={styles.floatingButtonInner}>
          <AnimatedDrawerIcon />
        </View>
      </PressableScale>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: 'black',
    flex: 1,
    justifyContent: 'center',
  },
  floatingButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderCurve: 'continuous',
    borderRadius: 30,
    bottom: 32,
    boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.3)',
    elevation: 8,
    position: 'absolute',
    right: 32,
  },
  floatingButtonInner: {
    alignItems: 'center',
    height: 60,
    justifyContent: 'center',
    width: 60,
  },
  subtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 14,
    marginTop: 8,
  },
  title: {
    color: 'white',
    fontSize: 24,
    fontWeight: '700',
    letterSpacing: 1,
    textAlign: 'center',
    textTransform: 'uppercase',
  },
});
