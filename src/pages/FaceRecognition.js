import React, { useRef, useState, useEffect, useCallback } from 'react';
import Webcam from 'react-webcam';
import * as faceapi from 'face-api.js';
import toast from 'react-hot-toast';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, CheckCircle, XCircle, Smile, Clock, Users, Activity, ZoomIn } from 'lucide-react';

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
  const [faceDistance, setFaceDistance] = useState(null);
  const [isFaceClose, setIsFaceClose] = useState(false);
  const [faceBox, setFaceBox] = useState(null);
  const navigate = useNavigate();

  const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
  
  // Distance threshold - adjust these values as needed
  const DISTANCE_THRESHOLD = {
    CLOSE: 200,    // Face area > 20000 pixels = very close
    MEDIUM: 100,   // Face area > 10000 pixels = medium distance
    FAR: 50        // Face area < 5000 pixels = too far
  };

  // Load face recognition models
  useEffect(() => {
    const loadModels = async () => {
      try {
        toast.loading('Loading face recognition models...', { id: 'loading' });
        await faceapi.nets.tinyFaceDetector.loadFromUri('/models');
        await faceapi.nets.faceLandmark68Net.loadFromUri('/models');
        await faceapi.nets.faceRecognitionNet.loadFromUri('/models');
        setModelsLoaded(true);
        toast.success('Face recognition ready! Come closer to camera', { id: 'loading' });
      } catch (error) {
        console.error('Failed to load models:', error);
        toast.error('Failed to load face models', { id: 'loading' });
      }
    };
    loadModels();
  }, []);

  // Calculate face distance based on bounding box area
  const calculateFaceDistance = (detection) => {
    if (!detection || !detection.detection || !detection.detection.box) {
      return null;
    }
    
    const box = detection.detection.box;
    const area = box.width * box.height;
    setFaceBox(box);
    
    // Determine distance level
    let distanceInfo = {
      area: area,
      isClose: false,
      level: 'far',
      message: 'Come closer to camera'
    };
    
    if (area >= DISTANCE_THRESHOLD.CLOSE) {
      distanceInfo.isClose = true;
      distanceInfo.level = 'close';
      distanceInfo.message = 'Perfect! Face detected';
    } else if (area >= DISTANCE_THRESHOLD.MEDIUM) {
      distanceInfo.isClose = false;
      distanceInfo.level = 'medium';
      distanceInfo.message = 'Come a bit closer';
    } else if (area >= DISTANCE_THRESHOLD.FAR) {
      distanceInfo.isClose = false;
      distanceInfo.level = 'far';
      distanceInfo.message = 'Please move closer to camera';
    } else {
      distanceInfo.isClose = false;
      distanceInfo.level = 'tooFar';
      distanceInfo.message = 'Too far! Move closer';
    }
    
    return distanceInfo;
  };

  // Get face descriptor and distance from webcam
  const getFaceInfo = useCallback(async () => {
    const video = webcamRef.current?.video;
    if (!video || video.readyState !== 4) return null;
    
    try {
      const detection = await faceapi.detectSingleFace(
        video,
        new faceapi.TinyFaceDetectorOptions()
      ).withFaceLandmarks().withFaceDescriptor();
      
      if (detection) {
        const distanceInfo = calculateFaceDistance(detection);
        setFaceDistance(distanceInfo);
        setIsFaceClose(distanceInfo?.isClose || false);
        return { descriptor: detection.descriptor, distanceInfo };
      } else {
        setFaceDistance(null);
        setIsFaceClose(false);
        setFaceBox(null);
        return null;
      }
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
    }, 5000);
  }, []);

  // Auto scan face - only when face is close enough
  const autoScanFace = useCallback(async () => {
    if (!modelsLoaded || isProcessing || isScanning) {
      return;
    }

    setIsProcessing(true);

    try {
      const faceInfo = await getFaceInfo();
      
      if (!faceInfo || !faceInfo.descriptor) {
        setIsProcessing(false);
        return;
      }
      
      // Only proceed if face is close enough
      if (!faceInfo.distanceInfo?.isClose) {
        // Show different messages based on distance
        let distanceMessage = '';
        switch (faceInfo.distanceInfo?.level) {
          case 'far':
            distanceMessage = 'Please move closer to the camera for accurate recognition';
            break;
          case 'medium':
            distanceMessage = 'Come a bit closer - face too far for recognition';
            break;
          case 'tooFar':
            distanceMessage = 'Too far! Please move much closer to the camera';
            break;
          default:
            distanceMessage = 'Please come closer to the camera';
        }
        showTemporaryMessage(`📷 ${distanceMessage}`, 'error');
        setIsProcessing(false);
        return;
      }

      setIsScanning(true);

      const response = await axios.post(`${API_URL}/attendance/recognize`, {
        faceDescriptor: Array.from(faceInfo.descriptor)
      });

      const { employee, scanTime, scanCount: count, message: responseMessage, toastMessage } = response.data;
      
      setLastAttendance({
        employee: employee.name,
        time: new Date(scanTime),
        scanCount: count
      });
      
      setScanCount(count);
      
      showTemporaryMessage(responseMessage, 'success');
      toast.success(toastMessage || `Scan recorded for ${employee.name}`);
      
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
  }, [modelsLoaded, isProcessing, isScanning, getFaceInfo, API_URL, showTemporaryMessage]);

  // Set up automatic scanning interval
  useEffect(() => {
    let scanInterval;
    if (modelsLoaded && !isScanning && !isProcessing) {
      scanInterval = setInterval(() => {
        autoScanFace();
      }, 2000); // Scan every 2 seconds (faster for better UX)
    }
    return () => {
      if (scanInterval) clearInterval(scanInterval);
    };
  }, [modelsLoaded, isScanning, isProcessing, autoScanFace]);

  // Get distance indicator color
  const getDistanceColor = () => {
    if (!faceDistance) return 'bg-gray-500';
    if (faceDistance.isClose) return 'bg-green-500';
    if (faceDistance.level === 'medium') return 'bg-yellow-500';
    return 'bg-red-500';
  };

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
          } text-white px-6 py-3 rounded-lg shadow-lg animate-bounce max-w-md`}>
            <div className="flex items-center space-x-2">
              {messageType === 'success' ? <Smile className="w-5 h-5" /> : <XCircle className="w-5 h-5" />}
              <span className="font-medium whitespace-pre-line">{message}</span>
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
            
            {/* Face Distance Indicator Overlay */}
            {faceDistance && (
              <div className="absolute top-4 left-4 bg-black bg-opacity-70 rounded-lg px-3 py-2">
                <div className="flex items-center space-x-2">
                  <div className={`w-3 h-3 rounded-full ${getDistanceColor()} animate-pulse`}></div>
                  <span className="text-white text-sm">{faceDistance.message}</span>
                </div>
                <div className="text-white text-xs mt-1">
                  Face size: {Math.round(faceDistance.area)}px
                </div>
              </div>
            )}
            
            {/* Face Bounding Box - Visual feedback */}
            {faceBox && !isFaceClose && (
              <div className="absolute border-2 border-yellow-500 rounded-lg animate-pulse"
                style={{
                  top: faceBox.top,
                  left: faceBox.left,
                  width: faceBox.width,
                  height: faceBox.height,
                  pointerEvents: 'none'
                }}>
                <div className="absolute -top-6 left-0 bg-yellow-500 text-white text-xs px-2 py-1 rounded">
                  Move Closer
                </div>
              </div>
            )}
            
            {/* Face Bounding Box - Close enough */}
            {faceBox && isFaceClose && !isScanning && !isProcessing && (
              <div className="absolute border-2 border-green-500 rounded-lg"
                style={{
                  top: faceBox.top,
                  left: faceBox.left,
                  width: faceBox.width,
                  height: faceBox.height,
                  pointerEvents: 'none'
                }}>
                <div className="absolute -top-6 left-0 bg-green-500 text-white text-xs px-2 py-1 rounded">
                  ✓ Ready to Scan
                </div>
              </div>
            )}
            
            {/* Scanning Overlay - Animated ring */}
            {modelsLoaded && !isScanning && !isProcessing && !isFaceClose && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-black bg-opacity-50 rounded-full p-8 text-center">
                  <ZoomIn className="w-12 h-12 text-white mx-auto mb-2 animate-bounce" />
                  <p className="text-white text-sm">Move closer to camera</p>
                </div>
              </div>
            )}
            
            {/* Scanning Overlay - Ready to scan */}
            {modelsLoaded && !isScanning && !isProcessing && isFaceClose && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="border-4 border-green-500 rounded-full w-56 h-56 animate-ping opacity-60"></div>
                <div className="absolute border-2 border-green-300 rounded-full w-64 h-64 animate-pulse opacity-40"></div>
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
            {!isScanning && modelsLoaded && !isProcessing && isFaceClose && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-green-600 bg-opacity-90 text-white px-4 py-2 rounded-full text-sm flex items-center whitespace-nowrap">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-2"></div>
                Face detected - Ready to scan!
              </div>
            )}
            
            {!isScanning && modelsLoaded && !isProcessing && !isFaceClose && faceDistance && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-yellow-600 bg-opacity-90 text-white px-4 py-2 rounded-full text-sm flex items-center whitespace-nowrap">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse mr-2"></div>
                {faceDistance.message || 'Move closer to camera'}
              </div>
            )}
            
            {!isScanning && modelsLoaded && !isProcessing && !faceDistance && (
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-black bg-opacity-70 text-white px-4 py-2 rounded-full text-sm flex items-center whitespace-nowrap">
                <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse mr-2"></div>
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
              {modelsLoaded ? 'Come closer to camera for automatic recognition' : 'Initializing camera and models...'}
            </p>
          </div>
        </div>

        {/* Distance Guide */}
        <div className="mt-6 bg-white rounded-lg p-4 shadow">
          <h3 className="font-semibold text-gray-800 mb-3 flex items-center">
            <ZoomIn className="w-4 h-4 mr-2 text-blue-500" />
            Face Distance Guide
          </h3>
          <div className="flex flex-col sm:flex-row justify-around gap-4">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-red-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Too Far - Move Closer</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-yellow-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Getting There - Come Closer</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Perfect Distance - Auto Scan</span>
            </div>
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
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2 text-sm">
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
            <li>• 📸 Look at the camera and move closer until the box turns GREEN</li>
            <li>• 🎯 Face must be close enough for accurate recognition</li>
            <li>• 🔄 Scan happens automatically when face is at correct distance</li>
            <li>• 💡 Ensure good lighting for best results</li>
            <li>• ✨ Green box = Ready to scan</li>
          </ul>
        </div>

        {/* Stats Cards */}
        <div className="mt-6 grid grid-cols-2 gap-4">
          <div className="bg-white rounded-lg p-4 shadow text-center">
            <div className="text-green-600 font-semibold">Auto Scan</div>
            <div className="text-2xl font-bold text-gray-800">{isFaceClose ? 'Active' : 'Waiting'}</div>
            <div className="text-xs text-gray-500">Face must be close</div>
          </div>
          <div className="bg-white rounded-lg p-4 shadow text-center">
            <div className="text-blue-600 font-semibold">Face Distance</div>
            <div className="text-2xl font-bold text-gray-800">
              {faceDistance ? Math.round(faceDistance.area) : 0}
            </div>
            <div className="text-xs text-gray-500">Target: 200+ pixels</div>
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