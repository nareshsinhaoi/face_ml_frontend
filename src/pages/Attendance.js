import React, { useState, useEffect, useCallback } from 'react';
import { Search, Download, Calendar, Users, Clock, Activity, Camera } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import toast from 'react-hot-toast';
import * as XLSX from 'xlsx';

const Attendance = () => {
  const [records, setRecords] = useState([]);
  const [filteredRecords, setFilteredRecords] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [employees, setEmployees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [viewMode, setViewMode] = useState('all'); // 'all' or 'summary'
  const [summaryData, setSummaryData] = useState([]);
const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Fetch all attendance records
  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      let url = `${API_URL}/attendance`;
      const params = [];
      
      if (startDate && endDate) {
        url += `?startDate=${startDate}&endDate=${endDate}`;
      }
      if (selectedEmployee) {
        url += `${startDate && endDate ? '&' : '?'}employeeId=${selectedEmployee}`;
      }
      
      const response = await axios.get(url, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRecords(response.data);
      setFilteredRecords(response.data);
    } catch (error) {
      console.error('Fetch error:', error);
      toast.error('Failed to fetch attendance records');
    } finally {
      setLoading(false);
    }
  }, [API_URL, startDate, endDate, selectedEmployee]);

  // Fetch employees list
  const fetchEmployees = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/employees`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setEmployees(response.data);
    } catch (error) {
      console.error('Fetch employees error:', error);
      toast.error('Failed to fetch employees');
    }
  }, [API_URL]);

  // Fetch daily summary
  const fetchDailySummary = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const date = startDate || new Date().toISOString().split('T')[0];
      const response = await axios.get(`${API_URL}/attendance/daily-summary?date=${date}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setSummaryData(response.data);
    } catch (error) {
      console.error('Summary fetch error:', error);
      toast.error('Failed to fetch summary');
    } finally {
      setLoading(false);
    }
  }, [API_URL, startDate]);

  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  useEffect(() => {
    if (viewMode === 'all') {
      fetchAttendance();
    } else {
      fetchDailySummary();
    }
  }, [viewMode, fetchAttendance, fetchDailySummary]);

  // Filter records based on search
  useEffect(() => {
    if (viewMode === 'all') {
      let filtered = [...records];
      
      if (searchTerm) {
        filtered = filtered.filter(record =>
          record.employee_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          record.employee_id?.includes(searchTerm)
        );
      }
      
      setFilteredRecords(filtered);
    }
  }, [searchTerm, records, viewMode]);

  // Export to Excel
  const exportToExcel = () => {
    let exportData;
    
    if (viewMode === 'all') {
      exportData = filteredRecords.map(record => ({
        'Employee ID': record.employee_id,
        'Employee Name': record.employee_name,
        'Scan Date': record.scan_date,
        'Scan Time': record.scan_time ? new Date(record.scan_time).toLocaleTimeString() : '-',
        'Scan Date Time': record.scan_time ? new Date(record.scan_time).toLocaleString() : '-'
      }));
    } else {
      exportData = summaryData.map(item => ({
        'Employee ID': item.employee_id,
        'Employee Name': item.employee_name,
        'Scan Count': item.scan_count,
        'First Scan': item.first_scan ? new Date(item.first_scan).toLocaleTimeString() : '-',
        'Last Scan': item.last_scan ? new Date(item.last_scan).toLocaleTimeString() : '-'
      }));
    }
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    const sheetName = viewMode === 'all' ? 'All Scans' : 'Daily Summary';
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    XLSX.writeFile(wb, `attendance_${new Date().toISOString().split('T')[0]}.xlsx`);
    toast.success('Report exported successfully');
  };

  // Get today's date for summary
  const today = new Date().toISOString().split('T')[0];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Dashboard
              </button>
              <button
                onClick={() => navigate('/employees')}
                className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium"
              >
                Employees
              </button>
              <button
                onClick={() => navigate('/face-recognition')}
                className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-green-700 flex items-center transition"
              >
                <Camera className="w-4 h-4 mr-2" />
                Face Recognition
              </button>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Attendance Records</h1>
            <div className="flex space-x-2">
              <button
                onClick={() => setViewMode('all')}
                className={`px-4 py-2 rounded-lg transition ${
                  viewMode === 'all' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Activity className="w-4 h-4 inline mr-1" />
                All Scans
              </button>
              <button
                onClick={() => setViewMode('summary')}
                className={`px-4 py-2 rounded-lg transition ${
                  viewMode === 'summary' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Users className="w-4 h-4 inline mr-1" />
                Daily Summary
              </button>
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {/* Filters */}
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {viewMode === 'all' && (
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by name or ID"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}
            
            <select
              value={selectedEmployee}
              onChange={(e) => setSelectedEmployee(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Employees</option>
              {employees.map(emp => (
                <option key={emp.id} value={emp.employee_id}>{emp.name} ({emp.employee_id})</option>
              ))}
            </select>
            
            <input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Start Date"
            />
            
            <input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="End Date"
            />
          </div>
          
          <div className="flex justify-between items-center mt-4">
            {viewMode === 'summary' && (
              <p className="text-sm text-gray-500 flex items-center">
                <Calendar className="w-4 h-4 mr-1" />
                Summary for date: {startDate || today}
              </p>
            )}
            <button
              onClick={exportToExcel}
              className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-green-700 ml-auto"
            >
              <Download className="w-4 h-4 mr-2" />
              Export to Excel
            </button>
          </div>
        </div>

        {/* Attendance Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading...</p>
            </div>
          ) : viewMode === 'all' ? (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scan Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scan Time</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Full Date Time</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredRecords.map((record) => (
                    <tr key={record.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{record.employee_id}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{record.employee_name}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">{record.scan_date}</td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {record.scan_time ? new Date(record.scan_time).toLocaleTimeString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {record.scan_time ? new Date(record.scan_time).toLocaleString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {filteredRecords.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  No scan records found
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scan Count</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">First Scan</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Scan</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {summaryData.map((item, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-sm text-gray-900">{item.employee_id}</td>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">{item.employee_name}</td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <Clock className="w-3 h-3 mr-1" />
                          {item.scan_count} scan{item.scan_count !== 1 ? 's' : ''}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {item.first_scan ? new Date(item.first_scan).toLocaleTimeString() : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {item.last_scan ? new Date(item.last_scan).toLocaleTimeString() : '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {summaryData.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <Users className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                  No attendance records for this date
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats Footer */}
        {viewMode === 'all' && filteredRecords.length > 0 && (
          <div className="mt-4 bg-gray-50 rounded-lg p-3 text-center">
            <p className="text-sm text-gray-600">
              Total Scans: <span className="font-semibold text-blue-600">{filteredRecords.length}</span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Attendance;