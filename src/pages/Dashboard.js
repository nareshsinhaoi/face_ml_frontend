import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Users, UserCheck, Clock, LogOut, Camera, Smile, TrendingUp } from 'lucide-react';
import axios from 'axios';
import toast from 'react-hot-toast';

const Dashboard = () => {
  const [stats, setStats] = useState({
    totalEmployees: 0,
    employeesWithFace: 0,
    todayAttendance: 0,
    presentToday: 0,
    lateToday: 0,
    lastWeek: []
  });
  const [recentActivities, setRecentActivities] = useState([]);
  const navigate = useNavigate();

  const API_URL = process.env.REACT_APP_API_URL;

  const fetchStats = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(response.data);
    } catch (error) {
      toast.error('Failed to fetch dashboard stats');
    }
  }, [API_URL]);

  const fetchRecentActivities = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/attendance`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecentActivities(response.data.slice(0, 5));
    } catch (error) {
      console.error('Failed to fetch activities');
    }
  }, [API_URL]);

  useEffect(() => {
    fetchStats();
    fetchRecentActivities();
  }, [fetchStats, fetchRecentActivities]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('admin');
    navigate('/login');
  };

  const faceRegistrationRate = stats.totalEmployees > 0 
    ? ((stats.employeesWithFace / stats.totalEmployees) * 100).toFixed(1)
    : 0;

  const attendanceRate = stats.totalEmployees > 0 
    ? ((stats.todayAttendance / stats.totalEmployees) * 100).toFixed(1)
    : 0;

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444'];

  const pieData = [
    { name: 'Present', value: stats.presentToday },
    { name: 'Late', value: stats.lateToday },
    { name: 'Absent', value: stats.totalEmployees - stats.todayAttendance }
  ];

  return (
    <div className="min-h-screen bg-gray-100">
            <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Desktop Navigation */}
          <div className="hidden md:flex justify-between items-center h-16">
            <div className="flex items-center space-x-2">
              <Smile className="h-8 w-8 text-blue-600" />
              <h1 className="text-xl font-bold text-gray-800">ModuleLabs Attendance System</h1>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/employees')}
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Employees
              </button>
              <button
                onClick={() => navigate('/attendance')}
                className="text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Attendance
              </button>
              <button
                onClick={() => navigate('/face-recognition')}
                className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-green-700 flex items-center transition text-sm"
              >
                <Camera className="w-4 h-4 mr-2" />
                Face Recognition
              </button>
              <button
                onClick={handleLogout}
                className="text-red-600 hover:text-red-700 flex items-center px-3 py-2 rounded-md text-sm font-medium"
              >
                <LogOut className="w-4 h-4 mr-1" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden py-3">
            <div className="flex justify-between items-center">
              <div className="flex items-center space-x-2">
                <Smile className="h-6 w-6 text-blue-600" />
                <h1 className="text-lg font-bold text-gray-800">ModuleLabs</h1>
              </div>
              <button
                onClick={() => document.getElementById('dashboardMobileMenu').classList.toggle('hidden')}
                className="text-gray-600 hover:text-gray-900 focus:outline-none"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
            
            <div id="dashboardMobileMenu" className="hidden mt-3 space-y-2">
              <button
                onClick={() => navigate('/employees')}
                className="w-full text-left text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Employees
              </button>
              <button
                onClick={() => navigate('/attendance')}
                className="w-full text-left text-gray-700 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Attendance
              </button>
              <button
                onClick={() => navigate('/face-recognition')}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-green-700 flex items-center justify-center transition text-sm"
              >
                <Camera className="w-4 h-4 mr-2" />
                Face Recognition
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-left text-red-600 hover:text-red-700 px-3 py-2 rounded-md text-sm font-medium"
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Total Employees</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalEmployees}</p>
              </div>
              <div className="bg-blue-100 rounded-full p-3">
                <Users className="w-8 h-8 text-blue-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Face Registered</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.employeesWithFace}</p>
                <p className="text-sm text-green-600 mt-1">{faceRegistrationRate}% of total</p>
              </div>
              <div className="bg-green-100 rounded-full p-3">
                <Smile className="w-8 h-8 text-green-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Today's Attendance</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.todayAttendance}</p>
                <p className="text-sm text-gray-600 mt-1">
                  {stats.presentToday} present, {stats.lateToday} late
                </p>
              </div>
              <div className="bg-yellow-100 rounded-full p-3">
                <UserCheck className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6 hover:shadow-xl transition">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-500 text-sm font-medium">Attendance Rate</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{attendanceRate}%</p>
                <div className="flex items-center mt-1">
                  <TrendingUp className="w-4 h-4 text-green-500 mr-1" />
                  <span className="text-sm text-green-600">Today</span>
                </div>
              </div>
              <div className="bg-purple-100 rounded-full p-3">
                <Clock className="w-8 h-8 text-purple-600" />
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Attendance Trend - Last 7 Days</h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={stats.lastWeek}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis dataKey="date" stroke="#6b7280" />
                <YAxis stroke="#6b7280" />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#3B82F6" strokeWidth={3} dot={{ fill: '#3B82F6', r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>

          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Today's Summary</h2>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-bold text-gray-800 mb-4">Recent Activities</h2>
          <div className="space-y-3">
            {recentActivities.map((activity, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <Users className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800">{activity.employee_name}</p>
                    <p className="text-xs text-gray-500">{activity.employee_id}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm text-gray-600">
                    {activity.check_in && `In: ${new Date(activity.check_in).toLocaleTimeString()}`}
                  </p>
                  <p className="text-sm text-gray-600">
                    {activity.check_out && `Out: ${new Date(activity.check_out).toLocaleTimeString()}`}
                  </p>
                </div>
              </div>
            ))}
            {recentActivities.length === 0 && (
              <p className="text-center text-gray-500 py-4">No recent activities</p>
            )}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
            <h3 className="text-xl font-bold mb-2">Quick Face Recognition</h3>
            <p className="text-blue-100 mb-4">Mark attendance using face recognition technology</p>
            <button
              onClick={() => navigate('/face-recognition')}
              className="bg-white text-blue-600 px-4 py-2 rounded-lg font-semibold hover:bg-blue-50 transition"
            >
              Start Recognition
            </button>
          </div>
          
          <div className="bg-gradient-to-r from-purple-500 to-purple-600 rounded-xl shadow-lg p-6 text-white">
            <h3 className="text-xl font-bold mb-2">View Attendance Reports</h3>
            <p className="text-purple-100 mb-4">Export and analyze attendance data</p>
            <button
              onClick={() => navigate('/attendance')}
              className="bg-white text-purple-600 px-4 py-2 rounded-lg font-semibold hover:bg-purple-50 transition"
            >
              View Reports
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;