import React, { useState, useRef, useEffect } from "react";
import {
  FaRobot,
  FaMicrophone,
  FaPaperPlane,
  FaTimes,
  FaMicrophoneSlash,
} from "react-icons/fa";
import { useNavigate, useLocation } from "react-router-dom";
import aiService from "../../api/aiService";
import AIMessageRenderer from "./AIMessageRenderer";
import styles from "./AIAssistant.module.css";

const AIAssistant = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isListening, setIsListening] = useState(false);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const recognition = useRef(null);
  const messagesEndRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Load chat history from localStorage
  useEffect(() => {
    const savedMessages = localStorage.getItem("ai-assistant-messages");
    if (savedMessages) {
      try {
        setMessages(JSON.parse(savedMessages));
      } catch (error) {
        console.error("Error loading chat history:", error);
      }
    }
  }, []);

  // Save chat history to localStorage
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(
        "ai-assistant-messages",
        JSON.stringify(messages.slice(-20))
      ); // Keep last 20 messages
    }
  }, [messages]);

  // Khởi tạo Speech Recognition
  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        window.SpeechRecognition || window.webkitSpeechRecognition;
      recognition.current = new SpeechRecognition();
      recognition.current.continuous = false;
      recognition.current.interimResults = false;
      recognition.current.lang = "vi-VN"; // Tiếng Việt

      recognition.current.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setMessage(transcript);
        setIsListening(false);
      };

      recognition.current.onerror = (event) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };

      recognition.current.onend = () => {
        setIsListening(false);
      };
    }
  }, []);

  // Theo dõi trạng thái online/offline
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // Auto scroll to bottom khi có tin nhắn mới
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleToggle = () => {
    setIsOpen(!isOpen);
  };

  const handleSpeechToggle = () => {
    if (isListening) {
      recognition.current?.stop();
      setIsListening(false);
    } else {
      if (recognition.current) {
        recognition.current.start();
        setIsListening(true);
      } else {
        alert("Trình duyệt không hỗ trợ nhận diện giọng nói");
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    const userMessage = message.trim();
    setMessage("");
    setMessages((prev) => [...prev, { type: "user", content: userMessage }]);
    setIsLoading(true);

    try {
      // Thử gọi API backend trước, nếu fail thì dùng offline processing
      const result = await aiService.processMessage(userMessage);

      // Xử lý các action đặc biệt trước
      if (result.action === "COMPARE_MONTHS" && result.data?.monthsData) {
        setMessages((prev) => [
          ...prev,
          {
            type: "assistant",
            content: result.response,
            showComparisonChart: true,
            comparisonData: result.data,
          },
        ]);
      } else if (result.action === "FINANCIAL_INSIGHTS" && result.data) {
        setMessages((prev) => [
          ...prev,
          {
            type: "assistant",
            content: result.response,
            showFinancialInsights: true,
            insightsData: result.data,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          { type: "assistant", content: result.response },
        ]);

        // Xử lý các action khác
        if (result.action) {
          await handleAction(result.action, result.data);
        }
      }

      // Phát âm thanh thông báo
      playNotificationSound();
    } catch (error) {
      console.error("AI Assistant error:", error);
      setMessages((prev) => [
        ...prev,
        {
          type: "assistant",
          content:
            "Xin lỗi, tôi gặp sự cố khi xử lý yêu cầu của bạn. Vui lòng thử lại sau.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (action, data) => {
    switch (action) {
      case "NAVIGATE":
        if (data?.path) {
          setTimeout(() => {
            navigate(data.path);
            setIsOpen(false);
          }, 1500);
        }
        break;

      case "CONFIRM_ADD_TRANSACTION":
        // Hiển thị confirmation với quick action buttons
        setMessages((prev) => [
          ...prev,
          {
            type: "assistant",
            content: `Xác nhận tạo giao dịch:\n• Loại: ${
              data.type === "CHITIEU" ? "Chi tiêu" : "Thu nhập"
            }\n• Số tiền: ${data.amount?.toLocaleString()}đ\n• Mô tả: ${
              data.name
            }\n• Danh mục: ${data.categoryGuess || "Chưa xác định"}`,
            showConfirmButtons: true,
            transactionData: data,
          },
        ]);
        break;

      case "CONFIRM_ADD_CATEGORY":
        // Hiển thị confirmation với quick action buttons cho category
        setMessages((prev) => [
          ...prev,
          {
            type: "assistant",
            content: `Xác nhận tạo danh mục:\n• Tên: ${data.name}\n• Loại: ${
              data.type === "CHITIEU" ? "Chi tiêu" : "Thu nhập"
            }`,
            showConfirmButtons: true,
            categoryData: data,
          },
        ]);
        break;

      case "CONFIRM_ADD_GOAL":
        // Hiển thị confirmation với quick action buttons cho goal
        setMessages((prev) => [
          ...prev,
          {
            type: "assistant",
            content: `Xác nhận tạo mục tiêu:\n• Tên: ${data.name}\n• Số tiền mục tiêu: ${data.targetAmount?.toLocaleString()}đ\n• Hạn: ${data.deadline}`,
            showConfirmButtons: true,
            goalData: data,
          },
        ]);
        break;

      case "CONFIRM_ADD_ACCOUNT":
        // Hiển thị confirmation với quick action buttons cho account
        setMessages((prev) => [
          ...prev,
          {
            type: "assistant",
            content: `Xác nhận tạo tài khoản:\n• Tên: ${data.name}\n• Loại: ${
              data.type === "TIENMAT" ? "Tiền mặt" : "Thẻ ngân hàng"
            }${data.bankName ? `\n• Ngân hàng: ${data.bankName}` : ""}${
              data.initialBalance > 0
                ? `\n• Số dư ban đầu: ${data.initialBalance.toLocaleString()}đ`
                : ""
            }`,
            showConfirmButtons: true,
            accountData: data,
          },
        ]);
        break;

      case "ADD_TRANSACTION":
        // Có thể mở modal thêm giao dịch hoặc navigate với pre-filled data
        setTimeout(() => {
          navigate("/transactions", { state: { prefilledData: data } });
          setIsOpen(false);
        }, 1500);
        break;

      case "ADD_GOAL":
        setTimeout(() => {
          navigate("/goals", { state: { prefilledData: data } });
          setIsOpen(false);
        }, 1500);
        break;

      case "SHOW_STATS":
        // Hiển thị thống kê với styled format
        setMessages((prev) => [
          ...prev,
          {
            type: "assistant",
            content: `📊 **Thống kê tháng ${data.month}/${data.year}**

💰 **Thu nhập:** ${data.formatted.income}
💸 **Chi tiêu:** ${data.formatted.expense}  
🏦 **Số dư:** ${data.formatted.balance}
📈 **Còn lại:** ${data.formatted.remaining}

${data.formatted.isPositive ? "✅ Tháng này bạn đã tiết kiệm được tiền!" : "⚠️ Tháng này bạn đã chi tiêu vượt thu nhập."}`,
            showStatsCard: true,
            statsData: data,
          },
        ]);
        break;

      case "ACCOUNT_CREATED":
        // Hiển thị thông báo tài khoản đã được tạo thành công
        setMessages((prev) => [
          ...prev,
          {
            type: "assistant",
            content: `✅ Tài khoản "${data.name}" đã được tạo thành công!`,
          },
        ]);
        break;

      default:
        break;
    }
  };

  const handleClose = () => {
    setIsOpen(false);
    setMessage("");
  };

  const clearChatHistory = () => {
    setMessages([]);
    localStorage.removeItem("ai-assistant-messages");
  };

  const handleConfirmTransaction = async (transactionData) => {
    try {
      setIsLoading(true);
      const result = await aiService.createTransactionFromAI(transactionData);

      if (result.success) {
        setMessages((prev) => [
          ...prev,
          {
            type: "assistant",
            content: "✅ Giao dịch đã được tạo thành công!",
          },
        ]);
        playNotificationSound();
      } else {
        setMessages((prev) => [
          ...prev,
          {
            type: "assistant",
            content: "❌ Có lỗi xảy ra khi tạo giao dịch. Vui lòng thử lại.",
          },
        ]);
      }
    } catch (error) {
      console.error("Error confirming transaction:", error);

      // Xử lý lỗi đặc biệt khi user chưa có account
      if (error.response?.data?.code === "NO_ACCOUNT_FOUND") {
        setMessages((prev) => [
          ...prev,
          {
            type: "assistant",
            content: `❌ ${error.response.data.message}\n\n💡 Bạn có muốn tôi hướng dẫn tạo tài khoản ngay không?`,
            showAccountSuggestion: true,
          },
        ]);
      } else {
        setMessages((prev) => [
          ...prev,
          {
            type: "assistant",
            content: "❌ Có lỗi xảy ra khi tạo giao dịch. Vui lòng thử lại.",
          },
        ]);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmCategory = async (categoryData) => {
    try {
      setIsLoading(true);

      const result = await aiService.createCategoryFromAI(categoryData);

      if (result.success) {
        setMessages((prev) => [
          ...prev,
          {
            type: "assistant",
            content: `✅ Đã tạo thành công danh mục "${categoryData.name}"!`,
          },
        ]);
        playNotificationSound();
      } else {
        setMessages((prev) => [
          ...prev,
          {
            type: "assistant",
            content: "❌ Có lỗi xảy ra khi tạo danh mục. Vui lòng thử lại.",
          },
        ]);
      }
    } catch (error) {
      console.error("Error creating category:", error);
      setMessages((prev) => [
        ...prev,
        {
          type: "assistant",
          content: "❌ Có lỗi xảy ra khi tạo danh mục. Vui lòng thử lại.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmGoal = async (goalData) => {
    try {
      setIsLoading(true);

      const result = await aiService.createGoalFromAI(goalData);

      if (result.success) {
        setMessages((prev) => [
          ...prev,
          {
            type: "assistant",
            content: `✅ Đã tạo thành công mục tiêu "${goalData.name}"!`,
          },
        ]);
        playNotificationSound();
      } else {
        setMessages((prev) => [
          ...prev,
          {
            type: "assistant",
            content: "❌ Có lỗi xảy ra khi tạo mục tiêu. Vui lòng thử lại.",
          },
        ]);
      }
    } catch (error) {
      console.error("Error creating goal:", error);
      setMessages((prev) => [
        ...prev,
        {
          type: "assistant",
          content: "❌ Có lỗi xảy ra khi tạo mục tiêu. Vui lòng thử lại.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleConfirmAccount = async (accountData) => {
    try {
      setIsLoading(true);

      const result = await aiService.createAccountFromAI(accountData);

      if (result.success) {
        setMessages((prev) => [
          ...prev,
          {
            type: "assistant",
            content: `✅ Đã tạo thành công tài khoản "${accountData.name}"!`,
          },
        ]);
        playNotificationSound();
      } else {
        setMessages((prev) => [
          ...prev,
          {
            type: "assistant",
            content: "❌ Có lỗi xảy ra khi tạo tài khoản. Vui lòng thử lại.",
          },
        ]);
      }
    } catch (error) {
      console.error("Error creating account:", error);
      setMessages((prev) => [
        ...prev,
        {
          type: "assistant",
          content: "❌ Có lỗi xảy ra khi tạo tài khoản. Vui lòng thử lại.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelTransaction = () => {
    setMessages((prev) => [
      ...prev,
      {
        type: "assistant",
        content: "Đã hủy tạo giao dịch. Bạn có cần hỗ trợ gì khác không?",
      },
    ]);
  };

  const handleCreateAccountSuggestion = () => {
    setMessages((prev) => [
      ...prev,
      {
        type: "assistant",
        content:
          "Tôi sẽ hướng dẫn bạn tạo tài khoản. Bạn hãy nói: 'tạo tài khoản tiền mặt' hoặc 'tạo tài khoản ngân hàng Vietcombank'",
      },
    ]);
  };

  const quickActions = [
    { label: "📊 Thống kê", command: "xem thống kê", icon: "📊" },
    { label: "� So sánh tháng", command: "so sánh 3 tháng gần nhất", icon: "📈" },
    { label: "🔍 Phân tích", command: "phân tích tài chính của tôi", icon: "🔍" },
    { label: "💸 Chi tiêu", command: "chi 50k ăn sáng", icon: "💸" },
  ];

  const handleQuickAction = (command) => {
    setMessage(command);
  };

  const getSampleCommands = () => [
    "chi 50k ăn sáng",
    "phân tích tài chính",
    "đánh giá tình hình tài chính",
    "so sánh chi tiêu 3 tháng",
    "tháng nào chi nhiều nhất",
    "xem chi tiêu",
    "xem mục tiêu",
  ];

  // Phát âm thanh thông báo
  const playNotificationSound = () => {
    try {
      const audio = new Audio(
        "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+LozmYdBySM0fPNeSsFJHfH8N2QQAoUXrTp66hVFApGn+Io"
      );
      audio.volume = 0.3;
      audio.play().catch(() => {
        // Ignore errors if audio can't play
      });
    } catch {
      // Ignore audio errors
    }
  };

  // Ẩn AI Assistant trên các trang không cần thiết
  const hiddenPaths = ["/", "/login", "/register"];
  const shouldHide = hiddenPaths.includes(location.pathname);

  // Không render nếu cần ẩn
  if (shouldHide) {
    return null;
  }

  return (
    <>
      {/* Floating Button */}
      <button
        className={styles.floatingButton}
        onClick={handleToggle}
        title="AI Assistant"
      >
        <FaRobot />
      </button>

      {/* Modal */}
      {isOpen && (
        <div className={styles.modal}>
          <div className={styles.modalContent}>
            {/* Header */}
            <div className={styles.header}>
              <div className={styles.headerTitle}>
                <FaRobot className={styles.headerIcon} />
                <h3>AI Assistant</h3>
                <span
                  className={`${styles.statusDot} ${
                    isOnline ? styles.online : styles.offline
                  }`}
                  title={isOnline ? "Online" : "Offline"}
                ></span>
              </div>
              <div className={styles.headerActions}>
                {messages.length > 0 && (
                  <button
                    className={styles.clearButton}
                    onClick={clearChatHistory}
                    title="Xóa lịch sử"
                  >
                    🗑️
                  </button>
                )}
                <button className={styles.closeButton} onClick={handleClose}>
                  <FaTimes />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className={styles.messagesContainer}>
              {messages.length === 0 ? (
                <div className={styles.welcomeMessage}>
                  <h4>Xin chào! Tôi có thể giúp bạn:</h4>
                  <div className={styles.quickActionsGrid}>
                    {quickActions.map((action, index) => (
                      <button
                        key={index}
                        className={styles.quickActionButton}
                        onClick={() => handleQuickAction(action.command)}
                      >
                        {action.label}
                      </button>
                    ))}
                  </div>
                  <ul className={styles.sampleCommands}>
                    {getSampleCommands().map((command, index) => (
                      <li key={index} onClick={() => setMessage(command)}>
                        {command}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                messages.map((msg, index) => (
                  <div
                    key={index}
                    className={`${styles.message} ${styles[msg.type]}`}
                  >
                    <div className={styles.messageContent}>
                      <AIMessageRenderer content={msg.content} />
                      {msg.showConfirmButtons && (
                        <div className={styles.confirmButtons}>
                          <button
                            className={styles.confirmButton}
                            onClick={() => {
                              if (msg.transactionData) {
                                handleConfirmTransaction(msg.transactionData);
                              } else if (msg.categoryData) {
                                handleConfirmCategory(msg.categoryData);
                              } else if (msg.goalData) {
                                handleConfirmGoal(msg.goalData);
                              } else if (msg.accountData) {
                                handleConfirmAccount(msg.accountData);
                              }
                            }}
                          >
                            ✅ Xác nhận
                          </button>
                          <button
                            className={styles.cancelButton}
                            onClick={handleCancelTransaction}
                          >
                            ❌ Hủy
                          </button>
                        </div>
                      )}
                      {msg.showAccountSuggestion && (
                        <div className={styles.confirmButtons}>
                          <button
                            className={styles.confirmButton}
                            onClick={handleCreateAccountSuggestion}
                          >
                            💰 Tạo tài khoản
                          </button>
                          <button
                            className={styles.cancelButton}
                            onClick={() => {
                              setMessages((prev) => [
                                ...prev,
                                {
                                  type: "assistant",
                                  content:
                                    "Được rồi, bạn có thể tạo tài khoản sau. Tôi có thể giúp gì khác không?",
                                },
                              ]);
                            }}
                          >
                            ❌ Để sau
                          </button>
                        </div>
                      )}
                      {msg.showStatsCard && (
                        <div className={styles.statsCard}>
                          <div className={styles.statsGrid}>
                            <div
                              className={`${styles.statItem} ${styles.income}`}
                            >
                              <span className={styles.statIcon}>💰</span>
                              <div className={styles.statInfo}>
                                <span className={styles.statLabel}>
                                  Thu nhập
                                </span>
                                <span className={styles.statValue}>
                                  {msg.statsData.formatted.income}
                                </span>
                              </div>
                            </div>
                            <div
                              className={`${styles.statItem} ${styles.expense}`}
                            >
                              <span className={styles.statIcon}>💸</span>
                              <div className={styles.statInfo}>
                                <span className={styles.statLabel}>
                                  Chi tiêu
                                </span>
                                <span className={styles.statValue}>
                                  {msg.statsData.formatted.expense}
                                </span>
                              </div>
                            </div>
                            <div
                              className={`${styles.statItem} ${styles.balance}`}
                            >
                              <span className={styles.statIcon}>🏦</span>
                              <div className={styles.statInfo}>
                                <span className={styles.statLabel}>Số dư</span>
                                <span className={styles.statValue}>
                                  {msg.statsData.formatted.balance}
                                </span>
                              </div>
                            </div>
                            <div
                              className={`${styles.statItem} ${styles.remaining} ${
                                msg.statsData.formatted.isPositive
                                  ? styles.positive
                                  : styles.negative
                              }`}
                            >
                              <span className={styles.statIcon}>📈</span>
                              <div className={styles.statInfo}>
                                <span className={styles.statLabel}>
                                  Còn lại
                                </span>
                                <span className={styles.statValue}>
                                  {msg.statsData.formatted.remaining}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                      {msg.showComparisonChart && msg.comparisonData && (
                        <div className={styles.comparisonChart}>
                          <div className={styles.monthsComparison}>
                            {msg.comparisonData.monthsData.map((monthData, idx) => {
                              const isHighest =
                                monthData.month === msg.comparisonData.highestExpenseMonth.month &&
                                monthData.year === msg.comparisonData.highestExpenseMonth.year;
                              const isLowest =
                                monthData.month === msg.comparisonData.lowestExpenseMonth.month &&
                                monthData.year === msg.comparisonData.lowestExpenseMonth.year;
                              
                              return (
                                <div
                                  key={idx}
                                  className={`${styles.monthCard} ${
                                    isHighest ? styles.highest : isLowest ? styles.lowest : ""
                                  }`}
                                >
                                  <div className={styles.monthHeader}>
                                    <span className={styles.monthName}>
                                      {monthData.monthName}
                                    </span>
                                    {isHighest && <span className={styles.badge}>🔴 Cao nhất</span>}
                                    {isLowest && <span className={styles.badge}>🟢 Thấp nhất</span>}
                                  </div>
                                  <div className={styles.monthStats}>
                                    <div className={styles.monthStatItem}>
                                      <span className={styles.monthStatLabel}>💰 Thu nhập:</span>
                                      <span className={styles.monthStatValue}>
                                        {monthData.totalIncome.toLocaleString()}đ
                                      </span>
                                    </div>
                                    <div className={styles.monthStatItem}>
                                      <span className={styles.monthStatLabel}>💸 Chi tiêu:</span>
                                      <span
                                        className={`${styles.monthStatValue} ${
                                          isHighest ? styles.expense : isLowest ? styles.income : ""
                                        }`}
                                      >
                                        {monthData.totalExpense.toLocaleString()}đ
                                      </span>
                                    </div>
                                    <div className={styles.monthStatItem}>
                                      <span className={styles.monthStatLabel}>📈 Số dư:</span>
                                      <span
                                        className={`${styles.monthStatValue} ${
                                          monthData.balance >= 0 ? styles.positive : styles.negative
                                        }`}
                                      >
                                        {monthData.balance.toLocaleString()}đ
                                      </span>
                                    </div>
                                    <div className={styles.monthStatItem}>
                                      <span className={styles.monthStatLabel}>📋 Giao dịch:</span>
                                      <span className={styles.monthStatValue}>
                                        {monthData.transactionCount}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      )}
                      {msg.showFinancialInsights && msg.insightsData && (
                        <div className={styles.financialInsights}>
                          <div className={styles.insightsGrid}>
                            {msg.insightsData.insights?.warnings?.length > 0 && (
                              <div className={`${styles.insightCard} ${styles.warning}`}>
                                <div className={styles.insightHeader}>
                                  <span className={styles.insightIcon}>⚠️</span>
                                  <span className={styles.insightTitle}>Cảnh báo</span>
                                </div>
                                <ul className={styles.insightList}>
                                  {msg.insightsData.insights.warnings.map((w, idx) => (
                                    <li key={idx}>{w}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {msg.insightsData.insights?.suggestions?.length > 0 && (
                              <div className={`${styles.insightCard} ${styles.suggestion}`}>
                                <div className={styles.insightHeader}>
                                  <span className={styles.insightIcon}>💡</span>
                                  <span className={styles.insightTitle}>Gợi ý</span>
                                </div>
                                <ul className={styles.insightList}>
                                  {msg.insightsData.insights.suggestions.map((s, idx) => (
                                    <li key={idx}>{s}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {msg.insightsData.insights?.positive?.length > 0 && (
                              <div className={`${styles.insightCard} ${styles.positive}`}>
                                <div className={styles.insightHeader}>
                                  <span className={styles.insightIcon}>✅</span>
                                  <span className={styles.insightTitle}>Điểm tốt</span>
                                </div>
                                <ul className={styles.insightList}>
                                  {msg.insightsData.insights.positive.map((p, idx) => (
                                    <li key={idx}>{p}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                            {msg.insightsData.insights?.habits?.length > 0 && (
                              <div className={`${styles.insightCard} ${styles.habit}`}>
                                <div className={styles.insightHeader}>
                                  <span className={styles.insightIcon}>🎯</span>
                                  <span className={styles.insightTitle}>Thói quen</span>
                                </div>
                                <ul className={styles.insightList}>
                                  {msg.insightsData.insights.habits.map((h, idx) => (
                                    <li key={idx}>{h}</li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
              {isLoading && (
                <div className={`${styles.message} ${styles.assistant}`}>
                  <div className={styles.messageContent}>
                    <div className={styles.typing}>
                      <span></span>
                      <span></span>
                      <span></span>
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form className={styles.inputForm} onSubmit={handleSubmit}>
              <div className={styles.inputContainer}>
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Nhập yêu cầu của bạn..."
                  className={styles.messageInput}
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className={`${styles.speechButton} ${
                    isListening ? styles.listening : ""
                  }`}
                  onClick={handleSpeechToggle}
                  disabled={isLoading}
                  title={isListening ? "Dừng ghi âm" : "Ghi âm"}
                >
                  {isListening ? <FaMicrophoneSlash /> : <FaMicrophone />}
                </button>
                <button
                  type="submit"
                  className={styles.sendButton}
                  disabled={!message.trim() || isLoading}
                  title="Gửi"
                >
                  <FaPaperPlane />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default AIAssistant;