import React from 'react';
import { FlatList, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { ThreeWGPUBoxClone } from './src/screens/ThreeWGPUBoxClone';
import { ThreeWGPUPhysics as ThreeWGPUPhysicsCannon } from './src/screens/ThreeWGPUPhysicsCannon';
import { ThreeWGPUPhysicsRapier } from './src/screens/ThreeWGPUPhysicsRapier';
import { CrossyRoadGame } from './src/screens/CrossyRoadGame';

type ScreenItem = { name: string; title: string; subtitle: string };

const SCREENS: ScreenItem[] = [
  { name: 'BoxClone', title: 'Three WGPU Box', subtitle: 'rotating cube' },
  { name: 'PhysicsCannon', title: 'Physics — cannon-es (JS)', subtitle: '40 boxes, pure JS' },
  { name: 'PhysicsRapier', title: 'Physics — Rapier (WASM)', subtitle: '80 boxes, Rust→WASM' },
  { name: 'CrossyRoad', title: 'Crossy Road (ported)', subtitle: 'swipe to move, port from web Three.js game' },
];

const Stack = createNativeStackNavigator();

function Home({ navigation }: any) {
  return (
    <View style={s.container}>
      <Text style={s.header}>demoWGPU2</Text>
      <Text style={s.sub}>RN 0.85 · Hermes V1 · WebGPU</Text>
      <FlatList
        data={SCREENS}
        keyExtractor={(i) => i.name}
        contentContainerStyle={{ padding: 16 }}
        renderItem={({ item }) => (
          <TouchableOpacity style={s.card} onPress={() => navigation.navigate(item.name)}>
            <Text style={s.cardTitle}>{item.title}</Text>
            <Text style={s.cardSub}>{item.subtitle}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator screenOptions={{ headerStyle: { backgroundColor: '#0a0e1a' }, headerTintColor: '#fff' }}>
          <Stack.Screen name="Home" component={Home} options={{ title: 'demoWGPU2' }} />
          <Stack.Screen name="BoxClone" component={ThreeWGPUBoxClone} options={{ title: 'Box' }} />
          <Stack.Screen name="PhysicsCannon" component={ThreeWGPUPhysicsCannon} options={{ title: 'Cannon (JS)' }} />
          <Stack.Screen name="PhysicsRapier" component={ThreeWGPUPhysicsRapier} options={{ title: 'Rapier (WASM)' }} />
          <Stack.Screen name="CrossyRoad" component={CrossyRoadGame} options={{ title: 'Crossy Road' }} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0a0e1a' },
  header: { color: '#fff', fontSize: 28, fontWeight: '700', paddingHorizontal: 16, paddingTop: 12 },
  sub: { color: '#7aa', fontSize: 12, paddingHorizontal: 16, paddingBottom: 8 },
  card: { backgroundColor: '#1a2238', padding: 16, borderRadius: 12, marginBottom: 10 },
  cardTitle: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cardSub: { color: '#9ab', fontSize: 12, marginTop: 4 },
});
