import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { useRef, useState } from 'react';
import {
  ActivityIndicator,
  Dimensions,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';

const { width } = Dimensions.get('window');

const FileUploader = ({
  onUploadSuccess,
  onUploadError,
  buttonTitle = "Upload File",
  apiUrl = "https://rmpublicschool.org/binex/api.php?task=upload",
  maxSize = 5 * 1024 * 1024, // 5MB
  allowedTypes = ["jpg", "jpeg", "png", "gif", "pdf"],
  theme = {
    primary: '#2196F3',
    success: '#4CAF50',
    error: '#F44336',
    warning: '#FF9800',
    background: '#FDF5F7',
    text: '#333333',
  },
  style = {},
}) => {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [showOptions, setShowOptions] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null); // 'success', 'error', or null
  const [statusMessage, setStatusMessage] = useState('');

  const abortControllerRef = useRef(null);

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + ' KB';
    else return (bytes / 1048576).toFixed(2) + ' MB';
  };

  const requestMediaLibraryPermissions = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      showErrorMessage('Media library permissions are needed to select images');
      return false;
    }
    return true;
  };

  const showErrorMessage = (message) => {
    setUploadStatus('error');
    setStatusMessage(message);
    setTimeout(() => {
      setUploadStatus(null);
      setStatusMessage('');
    }, 3000);
  };

  const showSuccessMessage = (message) => {
    setUploadStatus('success');
    setStatusMessage(message);
    setTimeout(() => {
      setUploadStatus(null);
      setStatusMessage('');
    }, 3000);
  };

  const pickDocument = async () => {
    try {
      setShowOptions(false);
      const result = await DocumentPicker.getDocumentAsync({
        type: ['image/*', 'application/pdf'],
        copyToCacheDirectory: true,
      });

      if (result.canceled) return null;

      const file = result.assets[0];
      const fileInfo = await FileSystem.getInfoAsync(file.uri);

      const fileObj = {
        uri: file.uri,
        name: file.name,
        type: file.mimeType,
        size: fileInfo.size || file.size,
        isImage: file.mimeType.startsWith('image/'),
      };

      setSelectedFile(fileObj);
      setShowPreview(true);

      return file;
    } catch (err) {
      console.error('Error picking document:', err);
      showErrorMessage('Failed to select document');
      return null;
    }
  };

  const pickImage = async () => {
    try {
      setShowOptions(false);
      const hasPermission = await requestMediaLibraryPermissions();
      if (!hasPermission) return null;

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (result.canceled) return null;

      const image = result.assets[0];
      const fileInfo = await FileSystem.getInfoAsync(image.uri);

      const fileObj = {
        uri: image.uri,
        name: image.uri.split('/').pop(),
        type: 'image/' + image.uri.split('.').pop().toLowerCase(),
        size: fileInfo.size,
        width: image.width,
        height: image.height,
        isImage: true,
      };

      setSelectedFile(fileObj);
      setShowPreview(true);

      return image;
    } catch (err) {
      console.error('Error picking image:', err);
      showErrorMessage('Failed to select image');
      return null;
    }
  };

  const takePicture = async () => {
    try {
      setShowOptions(false);
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        showErrorMessage('Camera permissions are needed to take pictures');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        // aspect: [4, 3],
        quality: 0.8,
      });

      if (result.canceled) return;

      const image = result.assets[0];
      const fileInfo = await FileSystem.getInfoAsync(image.uri);

      const fileObj = {
        uri: image.uri,
        name: `photo_${new Date().getTime()}.jpg`,
        type: 'image/jpeg',
        size: fileInfo.size,
        width: image.width,
        height: image.height,
        isImage: true,
      };

      setSelectedFile(fileObj);
      setShowPreview(true);
    } catch (err) {
      console.error('Error taking picture:', err);
      showErrorMessage('Failed to take picture');
    }
  };

  const processImage = async () => {
    if (!selectedFile || !selectedFile.isImage) return selectedFile;

    try {
      console.log('Processing image:', selectedFile.uri);
      // Resize large images to save bandwidth
      const manipResult = await manipulateAsync(
        selectedFile.uri,
        [{ resize: { width: 1200 } }],
        { compress: 0.8, format: SaveFormat.JPEG }
      );

      const fileInfo = await FileSystem.getInfoAsync(manipResult.uri);
      console.log('Processed image info:', fileInfo);

      const baseName = (selectedFile.name || 'photo').split('.')[0];
      return {
        ...selectedFile,
        uri: manipResult.uri,
        size: fileInfo.exists ? fileInfo.size : selectedFile.size,
        type: 'image/jpeg',
        name: baseName + '.jpg',
      };
    } catch (error) {
      console.error('Error processing image:', error);
      // If processing fails, return the original file
      return selectedFile;
    }
  };

  const validateFile = (file) => {
    // Check file size
    if (file.size > maxSize) {
      showErrorMessage(`File too large. Maximum size is ${formatFileSize(maxSize)}`);
      return false;
    }

    // Get file extension
    const fileExtension = file.name.split('.').pop().toLowerCase();

    // Check file type
    if (!allowedTypes.includes(fileExtension)) {
      showErrorMessage(`Invalid file type. Allowed: ${allowedTypes.join(', ')}`);
      return false;
    }

    return true;
  };

  const handleUpload = async () => {
    setShowPreview(false);

    if (!selectedFile) {
      showErrorMessage('No file selected');
      return;
    }

    try {
      // Process image if needed (resize/compress)
      const processedFile = selectedFile.isImage ? await processImage() : selectedFile;
      console.log('File ready for upload:', JSON.stringify(processedFile, null, 2));

      // Validate file
      if (!validateFile(processedFile)) {
        return;
      }

      // All validations passed, proceed to upload
      await uploadFile(processedFile);
    } catch (err) {
      console.error('handleUpload error:', err);
      showErrorMessage('Failed to prepare file for upload');
    }
  };

  const uploadFile = async (file) => {
    try {
      setLoading(true);
      setProgress(0);

      const fileName = file.name || `upload_${Date.now()}.jpg`;
      const fileType = file.type || 'application/octet-stream';

      console.log('Uploading file:', { uri: file.uri, name: fileName, type: fileType });
      console.log('Upload URL:', apiUrl);

      // Simulate progress while uploading
      const progressInterval = setInterval(() => {
        setProgress((prev) => Math.min(prev + 0.1, 0.9));
      }, 300);

      // Use Expo's native uploadAsync for proper multipart upload
      const response = await FileSystem.uploadAsync(apiUrl, file.uri, {
        httpMethod: 'POST',
        uploadType: FileSystem.FileSystemUploadType.MULTIPART,
        fieldName: 'file',
        mimeType: fileType,
        parameters: {},
        headers: {
          'Accept': 'application/json',
        },
      });

      clearInterval(progressInterval);
      setProgress(1);

      console.log('Server raw response:', response.body);

      let responseData;
      try {
        responseData = JSON.parse(response.body);
      } catch (e) {
        throw new Error('Invalid response from server');
      }

      if (responseData.success || responseData.status === 'success') {
        showSuccessMessage('File uploaded successfully');
        if (onUploadSuccess) onUploadSuccess(responseData);
      } else {
        console.error('Server upload response (not success):', JSON.stringify(responseData));
        showErrorMessage(responseData.error || responseData.message || 'Upload failed');
        if (onUploadError) onUploadError(responseData.error || responseData.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error details:', error);
      const errMsg = error instanceof Error ? error.message : 'An unexpected error occurred';
      showErrorMessage(errMsg);
      if (onUploadError) onUploadError(errMsg);
    } finally {
      setLoading(false);
      setProgress(0);
    }
  };

  const cancelUpload = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
    setProgress(0);
    showErrorMessage('Upload cancelled');
  };

  // Render file icon based on file type
  const renderFileIcon = () => {
    if (!selectedFile) return null;

    if (selectedFile.isImage) {
      return (
        <Image
          source={{ uri: selectedFile.uri }}
          style={styles.previewImage}
          resizeMode="contain"
        />
      );
    } else {
      // PDF or other document
      const extension = selectedFile.name.split('.').pop().toLowerCase();

      if (extension === 'pdf') {
        return (
          <View style={styles.fileIconContainer}>
            <FontAwesome5 name="file-pdf" size={80} color={theme.error} />
          </View>
        );
      } else {
        return (
          <View style={styles.fileIconContainer}>
            <FontAwesome5 name="file-alt" size={80} color={theme.primary} />
          </View>
        );
      }
    }
  };

  return (
    <View style={[styles.container, style]}>
      {/* Main upload button */}
      <TouchableOpacity
        style={[styles.button, { backgroundColor: theme.primary }]}
        onPress={() => setShowOptions(true)}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#FFF" size="small" />
        ) : (
          <>
            <Text style={styles.buttonText}>{buttonTitle}</Text>
            <Ionicons name="cloud-upload-outline" size={22} color="white" style={styles.buttonIcon} />
          </>
        )}
      </TouchableOpacity>

      {/* Upload progress */}
      {loading && (
        <View style={styles.progressSection}>
          <View style={styles.progressBarContainer}>
            <View
              style={[
                styles.progressBar,
                {
                  width: `${progress * 100}%`,
                  backgroundColor: theme.primary
                }
              ]}
            />
          </View>
          <View style={styles.progressDetails}>
            <Text style={styles.progressText}>{Math.round(progress * 100)}%</Text>
            <TouchableOpacity onPress={cancelUpload}>
              <Text style={[styles.cancelText, { color: theme.error }]}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Status message */}
      {uploadStatus && (
        <View style={[
          styles.statusContainer,
          {
            backgroundColor: uploadStatus === 'success'
              ? `${theme.success}15`
              : `${theme.error}15`,
            borderColor: uploadStatus === 'success'
              ? theme.success
              : theme.error,
          }
        ]}>
          <Ionicons
            name={uploadStatus === 'success' ? 'checkmark-circle' : 'alert-circle'}
            size={22}
            color={uploadStatus === 'success' ? theme.success : theme.error}
          />
          <Text style={styles.statusText}>{statusMessage}</Text>
        </View>
      )}

      {/* File options modal */}
      <Modal
        visible={showOptions}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowOptions(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowOptions(false)}
        >
          <View style={styles.optionsContainer}>
            <View style={styles.optionsHandle} />
            <Text style={styles.optionsTitle}>Upload File</Text>

            <TouchableOpacity style={styles.optionButton} onPress={pickDocument}>
              <View style={[styles.optionIconBg, { backgroundColor: `${theme.primary}15` }]}>
                <Ionicons name="document-text" size={24} color={theme.primary} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionText}>Document</Text>
                <Text style={styles.optionSubtext}>PDF, Images</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color="#BBBBBB" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionButton} onPress={pickImage}>
              <View style={[styles.optionIconBg, { backgroundColor: `${theme.success}15` }]}>
                <Ionicons name="images" size={24} color={theme.success} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionText}>Gallery</Text>
                <Text style={styles.optionSubtext}>Choose from your photos</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color="#BBBBBB" />
            </TouchableOpacity>

            <TouchableOpacity style={styles.optionButton} onPress={takePicture}>
              <View style={[styles.optionIconBg, { backgroundColor: `${theme.warning}15` }]}>
                <Ionicons name="camera" size={24} color={theme.warning} />
              </View>
              <View style={styles.optionTextContainer}>
                <Text style={styles.optionText}>Camera</Text>
                <Text style={styles.optionSubtext}>Take a new photo</Text>
              </View>
              <Ionicons name="chevron-forward" size={22} color="#BBBBBB" />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowOptions(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* File preview modal */}
      <Modal
        visible={showPreview}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPreview(false)}
      >
        <View style={styles.previewContainer}>
          <View style={styles.previewHeader}>
            <Text style={styles.previewTitle}>File Preview</Text>
            <TouchableOpacity onPress={() => setShowPreview(false)}>
              <Ionicons name="close" size={24} color={theme.text} />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.previewContent}>
            {renderFileIcon()}

            {selectedFile && (
              <View style={styles.fileInfoContainer}>
                <Text style={styles.fileName}>{selectedFile.name}</Text>
                <Text style={styles.fileInfo}>
                  {selectedFile.type} · {formatFileSize(selectedFile.size)}
                </Text>
              </View>
            )}
          </ScrollView>

          <View style={styles.previewActions}>
            <TouchableOpacity
              style={[styles.previewButton, { backgroundColor: theme.error }]}
              onPress={() => {
                setShowPreview(false);
                setSelectedFile(null);
              }}
            >
              <Text style={styles.previewButtonText}>Cancel</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.previewButton, { backgroundColor: theme.primary }]}
              onPress={handleUpload}
            >
              <Text style={styles.previewButtonText}>Upload</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
  buttonIcon: {
    marginLeft: 8,
  },
  // Progress section
  progressSection: {
    marginTop: 10,
    width: '100%',
  },
  progressBarContainer: {
    height: 8,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    borderRadius: 4,
  },
  progressDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  progressText: {
    fontSize: 12,
    color: '#666666',
  },
  cancelText: {
    fontSize: 12,
    fontWeight: '500',
  },
  // Status message
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderLeftWidth: 4,
  },
  statusText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 12,
    color: '#333333',
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  optionsContainer: {
    backgroundColor: 'white',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 10,
    paddingTop: 15,
  },
  optionsHandle: {
    width: 26,
    height: 4,
    backgroundColor: '#E0E0E0',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 15,
  },
  optionsTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#333',
  },
  optionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  optionIconBg: {
    width: 26,
    height: 26,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  optionTextContainer: {
    flex: 1,
  },
  optionText: {
    fontSize: 12,
    color: '#333',
    fontWeight: '500',
  },
  optionSubtext: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
  },
  cancelButton: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 12,
    color: '#666',
    fontWeight: '500',
  },
  // Preview modal
  previewContainer: {
    flex: 1,
    backgroundColor: '#FDF5F7',
  },
  previewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    paddingTop: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  previewTitle: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  previewContent: {
    flex: 1,
    padding: 10,
  },
  previewImage: {
    width: '100%',
    height: 300,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
  },
  fileIconContainer: {
    width: '100%',
    height: 200,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    marginBottom: 10,
  },
  fileInfoContainer: {
    marginTop: 10,
    padding: 10,
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
  },
  fileName: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  fileInfo: {
    fontSize: 12,
    color: '#666',
  },
  previewActions: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    padding: 10,
  },
  previewButton: {
    flex: 1,
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 5,
  },
  previewButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 12,
  },
});

export default FileUploader;