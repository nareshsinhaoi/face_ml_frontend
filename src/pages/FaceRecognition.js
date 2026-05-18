import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Smile, Clock, Users, Activity } from 'lucide-react';

const FaceRecognition = () => {
  const webcamRef = useRef(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [lastAttendance, setLastAttendance] = useState(null);
  const [showMessage, setShowMessage] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('success');
  const [scanCount, setScanCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const navigate = useNavigate();

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

  // Load face recognition models
  useEffect(() => {
    const loadModels = async () => {
      try {
        toast.loading('Loading face recognition models...', { id: 'loading' });
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
        setModelsLoaded(true);
        toast.success('Face recognition ready!', { id: 'loading' });
      } catch (error) {
        console.error('Failed to load models:', error);
        toast.error('Failed to load face models', { id: 'loading' });
      }
    };
    loadModels();
  }, []);

  // Get face descriptor from webcam
  const getFaceDescriptor = useCallback(async () => {
    const video = webcamRef.current?.video;
    if (!video || video.readyState !== 4) return null;
    
    try {
      const detection = await faceapi.detectSingleFace(
        video,
        new faceapi.TinyFaceDetectorOptions()
      ).withFaceLandmarks().withFaceDescriptor();
      
      return detection?.descriptor;
    } catch (error) {
      console.error('Face detection error:', error);
      return null;
    }
  }, []);

  // Show temporary success/error message
  const showTemporaryMessage = useCallback((msg, type = 'success') => {
    setMessage(msg);
    setMessageType(type);
    setShowMessage(true);
    setTimeout(() => {
      setShowMessage(false);
    }, 4000);
  }, []);

  // Auto scan face
  const autoScanFace = useCallback(async () => {
    if (!modelsLoaded || isProcessing || isScanning) {
      return;
    }

    setIsProcessing(true);

    try {
      const faceDescriptor = await getFaceDescriptor();
      
      if (!faceDescriptor) {
        setIsProcessing(false);
        return;
      }

      setIsScanning(true);

      const response = await axios.post(`${API_URL}/attendance/recognize`, {
        faceDescriptor: Array.from(faceDescriptor)
      });

      const { employee, scanTime, scanCount: count, message: responseMessage } = response.data;
      
      setLastAttendance({
        employee: employee.name,
        time: new Date(scanTime),
        scanCount: count
      });
      
      setScanCount(count);
      
      showTemporaryMessage(
        `✅ ${responseMessage || `Hello ${employee.name}! Scan recorded at ${new Date(scanTime).toLocaleTimeString()}`}`,
        'success'
      );
      
      toast.success(`Scan recorded for ${employee.name}`);
      
      // Reset scanning state after 3 seconds
      setTimeout(() => {
        setIsScanning(false);
        setIsProcessing(false);
      }, 3000);
      
    } catch (error) {
      console.error('Recognition error:', error);
      if (error.response?.data?.error === 'Face not recognized') {
        showTemporaryMessage('❌ Face not recognized. Please register your face first.', 'error');
      } else if (error.response?.data?.error) {
        showTemporaryMessage(`❌ ${error.response.data.error}`, 'error');
      } else {
        showTemporaryMessage('❌ Recognition failed. Please try again.', 'error');
      }
      setIsScanning(false);
      setIsProcessing(false);
    }
  }, [modelsLoaded, isProcessing, isScanning, getFaceDescriptor, API_URL, showTemporaryMessage]);

  // Set up automatic scanning interval
  useEffect(() => {
    let scanInterval;
    if (modelsLoaded && !isScanning && !isProcessing) {
      scanInterval = setInterval(() => {
        autoScanFace();
      }, 4000); // Scan every 4 seconds
    }
    return () => {
      if (scanInterval) clearInterval(scanInterval);
    };
  }, [modelsLoaded, isScanning, isProcessing, autoScanFace]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50">
      {/* Header */}
      <nav className="bg-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <button
                onClick={() => navigate('/')}
                className="text-gray-600 hover:text-gray-900 transition"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h1 className="text-2xl font-bold text-gray-800">Face Recognition</h1>
            </div>
            <div className="flex items-center space-x-2">
              {modelsLoaded ? (
                <span className="flex items-center text-green-600 bg-green-50 px-3 py-1 rounded-full">
                  <CheckCircle className="w-4 h-4 mr-1" />
                  <span className="text-sm">Ready</span>
                </span>
              ) : (
                <span className="flex items-center text-yellow-600 bg-yellow-50 px-3 py-1 rounded-full">
                  <XCircle className="w-4 h-4 mr-1" />
                  <span className="text-sm">Loading...</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </nav>

      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Floating Message */}
        {showMessage && (
          <div className={`fixed top-24 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ${
            messageType === 'success' ? 'bg-green-500' : 'bg-red-500'
          } text-white px-6 py-3 rounded-lg shadow-lg animate-bounce`}>
            <div className="flex items-center space-x-2">
              {messageType === 'success' ? <Smile className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              <span className="font-medium">{message}</span>
            </div>
          </div>
        )}

        {/* Webcam Section */}
        <div className="bg-white rounded-xl shadow-xl overflow-hidden">
          <div className="relative bg-black">
            <Webcam
              ref={webcamRef}
              className="w-full h-auto"
              screenshotFormat="image/jpeg"
              videoConstraints={{ facingMode: 'user' }}
              mirrored={true}
            />
            
            {/* Scanning Overlay - Animated ring */}
            {modelsLoaded && !isScanning && !isProcessing && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="border-4 border-blue-500 rounded-full w-56 h-56 animate-ping opacity-60"></div>
                <div className="absolute border-2 border-blue-300 rounded-full w-64 h-64 animate-pulse opacity-40"></div>
              </div>
            )}
            
            {/* Scanning Indicator */}
            {isScanning && (
              <div className="absolute top-4 right-4 bg-blue-600 text-white px-3 py-1 rounded-full text-sm flex items-center shadow-lg">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                Scanning...
              </div>
            )}
            
            {/* Status Message */}
            {!isScanning && modelsLoaded && !isProcessing && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white px-4 py-2 rounded-full text-sm flex items-center whitespace-nowrap">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2"></div>
                Looking for face...
              </div>
            )}
            
            {isProcessing && !isScanning && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-yellow-600 text-white px-4 py-2 rounded-full text-sm flex items-center">
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white mr-2"></div>
                Processing...
              </div>
            )}

            {/* Loading Overlay */}
            {!modelsLoaded && (
              <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
                <div className="text-white text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
                  <p>Loading face models...</p>
                </div>
              </div>
            )}
          </div>

          <div className="p-6 text-center bg-gradient-to-r from-blue-50 to-purple-50">
            <p className="text-gray-600 flex items-center justify-center">
              <Activity className="w-4 h-4 mr-2 text-blue-500" />
              {modelsLoaded ? 'Camera is active - Face will be detected automatically' : 'Initializing camera and models...'}
            </p>
          </div>
        </div>

        {/* Last Scan Info */}
        {lastAttendance && (
          <div className="mt-6 bg-green-50 border border-green-200 rounded-lg p-4 animate-fadeIn">
            <div className="flex items-center space-x-3">
              <div className="bg-green-100 rounded-full p-2">
                <Users className="w-5 h-5 text-green-600" />
              </div>
              <div className="flex-1">
                <h3 className="font-semibold text-green-800">Last Scan</h3>
                <div className="grid grid-cols-2 gap-2 mt-2 text-sm">
                  <div>
                    <p className="text-green-700">👤 Employee: {lastAttendance.employee}</p>
                    <p className="text-green-700">📊 Today's Scans: {lastAttendance.scanCount}</p>
                  </div>
                  <div>
                    <p className="text-green-700">⏰ Time: {lastAttendance.time.toLocaleTimeString()}</p>
                    <p className="text-green-700">📅 Date: {lastAttendance.time.toLocaleDateString()}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Today's Scan Count */}
        {scanCount > 0 && (
          <div className="mt-4 bg-blue-50 rounded-lg p-3 text-center">
            <p className="text-blue-700">
              <strong>Today's scan count:</strong> {scanCount} time{scanCount !== 1 ? 's' : ''}
            </p>
          </div>
        )}

        {/* Instructions */}
        <div className="mt-6 bg-blue-50 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2 flex items-center">
            <Clock className="w-4 h-4 mr-2" />
            How it works
          </h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 📸 Simply look at the camera - attendance is automatic</li>
            <li>• 🔄 Each face scan creates a new attendance record</li>
            <li>• 💡 Ensure good lighting and remove glasses/masks if possible</li>
            <li>• ✨ You'll see a success message when scan is recorded</li>
            <li>• 📊 Multiple scans per day are allowed and tracked</li>
          </ul>
        </div>

        {/* Stats Cards */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4 shadow text-center">
            <div className="text-green-600 font-semibold">Auto Scan</div>
            <div className="text-2xl font-bold text-gray-800">Active</div>
            <div className="text-xs text-gray-500">No button needed</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow text-center">
            <div className="text-blue-600 font-semibold">Today's Scans</div>
            <div className="text-2xl font-bold text-gray-800">{scanCount}</div>
            <div className="text-xs text-gray-500">This session only</div>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-in-out;
        }
        @keyframes bounce {
          0%, 100% { transform: translateX(-50%) translateY(0); }
          50% { transform: translateX(-50%) translateY(-10px); }
        }
        .animate-bounce {
          animation: bounce 0.5s ease-in-out;
        }
      `}</style>
    </div>
  );
};

export default FaceRecognition;