import axios from '../plugins/axios';
import API_CONFIG from '../config/api';

const API_BASE_URL = API_CONFIG.ENDPOINTS.PERSONAL_NOTES;

export const personalNoteService = {
  // Lấy tất cả ghi chú của user hiện tại
  getAllNotes: async () => {
    try {
      const response = await axios.get(API_BASE_URL);
      return response.data;
    } catch (error) {
      console.error('Error fetching all personal notes:', error);
      throw error;
    }
  },

  // Lấy ghi chú theo ngày
  getNoteByDate: async (date) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/date/${date}`);
      return response.data;
    } catch (error) {
      if (error.response && error.response.status === 404) {
        return null; // Không có ghi chú cho ngày này
      }
      console.error('Error fetching note by date:', error);
      throw error;
    }
  },

  // Lấy ghi chú trong khoảng thời gian
  getNotesByDateRange: async (startDate, endDate) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/range`, {
        params: { startDate, endDate }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching notes by date range:', error);
      throw error;
    }
  },

  // Lấy ghi chú theo ID
  getNoteById: async (id) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching note by id:', error);
      throw error;
    }
  },

  // Tạo hoặc cập nhật ghi chú
  saveOrUpdateNote: async (noteDate, content, publicVisible) => {
    try {
      const response = await axios.post(API_BASE_URL, {
        noteDate,
        content,
        publicVisible
      });
      return response.data;
    } catch (error) {
      console.error('Error saving/updating note:', error);
      throw error;
    }
  },

  // Xóa ghi chú theo ID
  deleteNote: async (id) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting note:', error);
      throw error;
    }
  },

  // Xóa ghi chú theo ngày
  deleteNoteByDate: async (date) => {
    try {
      const response = await axios.delete(`${API_BASE_URL}/date/${date}`);
      return response.data;
    } catch (error) {
      console.error('Error deleting note by date:', error);
      throw error;
    }
  },

  // Lấy số lượng ghi chú theo từng tháng trong năm
  getMonthCountsForYear: async (year) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/year/${year}/month-counts`);
      return response.data;
    } catch (error) {
      console.error('Error fetching month counts for year:', error);
      throw error;
    }
  },

  // Lấy tất cả ghi chú từ ngày hiện tại trở đi (tương lai)
  getFutureNotes: async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/future`);
      return response.data;
    } catch (error) {
      console.error('Error fetching future notes:', error);
      throw error;
    }
  },

  getPublicNotesByDate: async (date) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/public/date/${date}`);
      return response.data;
    } catch (error) {
      console.error('Error fetching public notes by date:', error);
      throw error;
    }
  },

  getPublicNotesByRange: async (startDate, endDate) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/public/range`, {
        params: { startDate, endDate }
      });
      return response.data;
    } catch (error) {
      console.error('Error fetching public notes by range:', error);
      throw error;
    }
  }
};

export default personalNoteService;

