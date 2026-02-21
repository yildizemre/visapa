import React from 'react';
import { View } from 'react-native';
import { NavigationContainer, useNavigationContainerRef } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import LoginPage from '../components/LoginPage';
import Dashboard from '../screens/Dashboard';
import CustomerAnalytics from '../screens/CustomerAnalytics';
import StaffManagement from '../screens/StaffManagement';
import Heatmaps from '../screens/Heatmaps';
import QueueAnalysis from '../screens/QueueAnalysis';
import ReportAnalytics from '../screens/ReportAnalytics';
import Chat from '../screens/Chat';
import Settings from '../screens/Settings';
import AdminUsers from '../screens/AdminUsers';
import ActivityLogs from '../screens/ActivityLogs';
import LoadingOverlay from '../components/LoadingOverlay';
import AsyncStorage from '@react-native-async-storage/async-storage';

const Stack = createNativeStackNavigator();

export const AppNavigator: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(true);
  const navigationRef = useNavigationContainerRef();

  const checkAuth = async () => {
    try {
      const token = await AsyncStorage.getItem('token');
      setIsAuthenticated(!!token);
    } catch (error) {
      console.error('Auth check error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    checkAuth();
    
    // Her 2 saniyede bir token kontrolü yap (impersonate için)
    const interval = setInterval(() => {
      checkAuth();
    }, 2000);
    
    return () => clearInterval(interval);
  }, []);

  const handleLogin = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    await AsyncStorage.removeItem('token');
    await AsyncStorage.removeItem('user');
    await AsyncStorage.removeItem('selectedStoreId');
    setIsAuthenticated(false);
  };

  if (isLoading) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0f172a' }}>
        <LoadingOverlay message="Yükleniyor..." />
      </View>
    );
  }

  return (
    <NavigationContainer ref={navigationRef}>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {!isAuthenticated ? (
          <Stack.Screen name="Login">
            {(props) => <LoginPage {...props} onLogin={handleLogin} />}
          </Stack.Screen>
        ) : (
          <>
            <Stack.Screen name="Dashboard">
              {(props) => <Dashboard {...props} onLogout={handleLogout} />}
            </Stack.Screen>
            <Stack.Screen name="CustomerAnalytics">
              {(props) => <CustomerAnalytics {...props} onLogout={handleLogout} />}
            </Stack.Screen>
            <Stack.Screen name="StaffManagement">
              {(props) => <StaffManagement {...props} onLogout={handleLogout} />}
            </Stack.Screen>
            <Stack.Screen name="Heatmaps">
              {(props) => <Heatmaps {...props} onLogout={handleLogout} />}
            </Stack.Screen>
            <Stack.Screen name="QueueAnalysis">
              {(props) => <QueueAnalysis {...props} onLogout={handleLogout} />}
            </Stack.Screen>
            <Stack.Screen name="ReportAnalytics">
              {(props) => <ReportAnalytics {...props} onLogout={handleLogout} />}
            </Stack.Screen>
            <Stack.Screen name="Chat">
              {(props) => <Chat {...props} onLogout={handleLogout} />}
            </Stack.Screen>
            <Stack.Screen name="Settings">
              {(props) => <Settings {...props} onLogout={handleLogout} />}
            </Stack.Screen>
            <Stack.Screen name="AdminUsers">
              {(props) => <AdminUsers {...props} onLogout={handleLogout} />}
            </Stack.Screen>
            <Stack.Screen name="ActivityLogs">
              {(props) => <ActivityLogs {...props} onLogout={handleLogout} />}
            </Stack.Screen>
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};
