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
  const [viewMode, setViewMode] = useState('all');
  const [summaryData, setSummaryData] = useState([]);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Pagination calculations
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredRecords.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredRecords.length / itemsPerPage);

  // Helper functions for date formatting (as stored in database)
  // Helper functions for date formatting (as stored in database - IST)
const formatScanDate = (dateValue) => {
  if (!dateValue) return '-';
  // If it's already in YYYY-MM-DD format from database
  if (typeof dateValue === 'string' && dateValue.match(/^\d{4}-\d{2}-\d{2}$/)) {
    return dateValue;
  }
  // If it's ISO string or Date object
  const date = new Date(dateValue);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Format time as stored in database: 2026-05-19 3:07 PM
const formatScanTime = (dateTime) => {
  if (!dateTime) return '-';
  
  // Add 5.5 hours (IST offset) to UTC time
  const date = new Date(dateTime);
  const istOffset = 0;//5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
  const istDate = new Date(date.getTime() + istOffset);
  
  const year = istDate.getUTCFullYear();
  const month = String(istDate.getUTCMonth() + 1).padStart(2, '0');
  const day = String(istDate.getUTCDate()).padStart(2, '0');
  let hours = istDate.getUTCHours();
  const minutes = String(istDate.getUTCMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  
  return `${year}-${month}-${day} ${hours}:${minutes} ${ampm}`;
};

// Format full date time as: 5/19/2026, 3:07 PM
const formatFullDateTime = (dateTime) => {
  if (!dateTime) return '-';
  const date = new Date(dateTime);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const year = date.getFullYear();
  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  return `${month}/${day}/${year}, ${hours}:${minutes} ${ampm}`;
};

  // Fetch all attendance records
  const fetchAttendance = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      let url = `${API_URL}/attendance`;
      
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
      setCurrentPage(1);
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
      setCurrentPage(1);
    }
  }, [searchTerm, records, viewMode]);

  // Export to Excel
  const exportToExcel = () => {
    let exportData;
    
    if (viewMode === 'all') {
      exportData = filteredRecords.map(record => ({
        'Employee ID': record.employee_id,
        'Employee Name': record.employee_name,
        'Scan Date': formatScanDate(record.scan_date),
        'Scan Time': record.scan_time ? formatScanTime(record.scan_time) : '-',
        'Full Date Time': record.scan_time ? formatFullDateTime(record.scan_time) : '-'
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

  // Pagination handlers
  const goToPreviousPage = () => {
    setCurrentPage(prev => Math.max(prev - 1, 1));
  };

  const goToNextPage = () => {
    setCurrentPage(prev => Math.min(prev + 1, totalPages));
  };

  const goToPage = (page) => {
    setCurrentPage(page);
  };

  // Get today's date for summary
  const today = new Date().toISOString().split('T')[0];

  // Generate page numbers
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-3">
          {/* Desktop Navigation */}
          <div className="hidden md:flex justify-between items-center">
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
                className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-green-700 flex items-center transition text-sm"
              >
                <Camera className="w-4 h-4 mr-2" />
                Face Recognition
              </button>
            </div>
            <h1 className="text-2xl font-bold text-gray-800">Attendance Records</h1>
            <div className="flex space-x-2">
              <button
                onClick={() => setViewMode('all')}
                className={`px-4 py-2 rounded-lg transition text-sm ${
                  viewMode === 'all' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Activity className="w-4 h-4 inline mr-1" />
                <span className="hidden sm:inline">All Scans</span>
                <span className="sm:hidden">All</span>
              </button>
              <button
                onClick={() => setViewMode('summary')}
                className={`px-4 py-2 rounded-lg transition text-sm ${
                  viewMode === 'summary' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                <Users className="w-4 h-4 inline mr-1" />
                <span className="hidden sm:inline">Daily Summary</span>
                <span className="sm:hidden">Summary</span>
              </button>
            </div>
          </div>

          {/* Mobile Navigation */}
          <div className="md:hidden">
            <div className="flex justify-between items-center mb-3">
              <h1 className="text-xl font-bold text-gray-800">Attendance Records</h1>
              <button
                onClick={() => document.getElementById('mobileMenu').classList.toggle('hidden')}
                className="text-gray-600 hover:text-gray-900 focus:outline-none"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              </button>
            </div>
            
            <div id="mobileMenu" className="hidden space-y-2">
              <div className="flex flex-col space-y-2">
                <button
                  onClick={() => navigate('/')}
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium text-left"
                >
                  Dashboard
                </button>
                <button
                  onClick={() => navigate('/employees')}
                  className="text-gray-600 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium text-left"
                >
                  Employees
                </button>
                <button
                  onClick={() => navigate('/face-recognition')}
                  className="bg-gradient-to-r from-green-500 to-green-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-green-700 flex items-center justify-center transition text-sm"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Face Recognition
                </button>
              </div>
              <div className="flex space-x-2 pt-2 border-t border-gray-200">
                <button
                  onClick={() => {
                    setViewMode('all');
                    document.getElementById('mobileMenu').classList.add('hidden');
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg transition text-sm ${
                    viewMode === 'all' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                  }`}
                >
                  <Activity className="w-4 h-4 inline mr-1" />
                  All Scans
                </button>
                <button
                  onClick={() => {
                    setViewMode('summary');
                    document.getElementById('mobileMenu').classList.add('hidden');
                  }}
                  className={`flex-1 px-4 py-2 rounded-lg transition text-sm ${
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
            <div className="flex items-center space-x-3 ml-auto">
              {viewMode === 'all' && (
                <div className="flex items-center space-x-2">
                  <label className="text-sm text-gray-600">Show:</label>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => {
                      setItemsPerPage(Number(e.target.value));
                      setCurrentPage(1);
                    }}
                    className="px-2 py-1 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                  >
                    <option value={5}>5</option>
                    <option value={10}>10</option>
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                  </select>
                </div>
              )}
              <button
                onClick={exportToExcel}
                className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center hover:bg-green-700"
              >
                <Download className="w-4 h-4 mr-2" />
                Export to Excel
              </button>
            </div>
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
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee ID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Employee Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scan Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scan Time</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Full Date Time</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {currentItems.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 text-sm text-gray-900">#{record.id} </td>
                        <td className="px-6 py-4 text-sm text-gray-900">{record.employee_id}</td>
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">{record.employee_name}</td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatScanDate(record.scan_date)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                         {record.scan_time ? formatScanTime(record.scan_time) : '-'}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500">
                          {record.scan_time ? formatFullDateTime(record.scan_time) : '-'}
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

              {/* Pagination */}
              {filteredRecords.length > 0 && (
                <div className="px-6 py-4 bg-gray-50 border-t border-gray-200">
                  <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                    <div className="text-sm text-gray-600">
                      Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredRecords.length)} of {filteredRecords.length} entries
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={goToPreviousPage}
                        disabled={currentPage === 1}
                        className={`px-3 py-1 rounded-md flex items-center ${
                          currentPage === 1
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                        }`}
                      >
                        Previous
                      </button>
                      
                      {/* Page Numbers - Desktop */}
                      <div className="hidden sm:flex space-x-1">
                        {getPageNumbers().map((page, index) => (
                          page === '...' ? (
                            <span key={`dots-${index}`} className="px-3 py-1 text-gray-500">...</span>
                          ) : (
                            <button
                              key={page}
                              onClick={() => goToPage(page)}
                              className={`px-3 py-1 rounded-md ${
                                currentPage === page
                                  ? 'bg-blue-600 text-white'
                                  : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                              }`}
                            >
                              {page}
                            </button>
                          )
                        ))}
                      </div>
                      
                      {/* Page Numbers - Mobile */}
                      <div className="sm:hidden text-sm text-gray-600">
                        Page {currentPage} of {totalPages}
                      </div>
                      
                      <button
                        onClick={goToNextPage}
                        disabled={currentPage === totalPages}
                        className={`px-3 py-1 rounded-md flex items-center ${
                          currentPage === totalPages
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-300'
                        }`}
                      >
                        Next
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
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
                        {item.first_scan ? formatFullDateTime(item.first_scan) : '-'}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {item.last_scan ? formatFullDateTime(item.last_scan) : '-'}
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