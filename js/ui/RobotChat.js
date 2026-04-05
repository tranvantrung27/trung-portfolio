import * as THREE from 'three';

export class RobotChat {
  constructor(robotEntity) {
    this.robot = robotEntity;
    this.chatBubble = document.getElementById('robot-chat-bubble');
    this.chatText = document.getElementById('robot-chat-text');

    // Phân loại Message theo Context
    this.messages = {
      intro: [
        "Xin chàooo! Tôi là trợ lý AI lỏ của trang web này...",
      ],
      idle: [
        "Code chạy được không Bug là thành công rồi 👍",
        "Bạn thấy dải LED sạc Pin của tôi xịn không? 🔋",
        "Hệ thống ổn định. Không có dấu hiệu của ruồi muỗi.",
        "Tôi được train bằng cà phê và deadline ☕"
      ],
      hint: [
        "Máy game đằng kia kìa.Để toii xem trình độ của bạn :3",
      ],
      fun: [
        "Lỗi 404: Đùa đấy, mạng nhà bạn vẫn ngon! 🤖",
        "Deep Learning nhưng vẫn deep thiếu ngủ 😵",
        "Khám phá trang WEB đi bạn eiii... cuộn chuột đi!",
        "Computer Vision nhưng vẫn không thấy được crush 😢"
      ],
      react: [
        "Bạn vừa click gì thế 👀",
        "Cứ bấm lung tung coi chừng rơi mất ốc vít của tôi nha!",
        "Dò mã độc... Không rà trúng gì cả. Phù! 🛡️"
      ]
    };

    this.lastMessages = [];
    this.idleTime = 0;

    this.typingInterval = null;
    this.readyToShow = false;
    this.isTyping = false;
    this.arcadeHoveredContext = false; // Updated every frame by main.js

    this.initEvents();
    this.init();
  }

  initEvents() {
    // Reset thời gian idle mỗi khi User cử động chuột
    window.addEventListener('pointermove', () => {
      this.idleTime = 0;
    });

    // Action Level Pro: User Click -> Robot React
    window.addEventListener('pointerdown', (e) => {
      this.idleTime = 0;
      // Tránh cướp click của UI HTML (Chỉ lấy click từ không gian Canvas 3D)
      if (e.target.tagName !== 'CANVAS') return;

      // Xác suất 40% Robot sẽ càu nhàu khi bị Click (Tránh spam phiền phức)
      if (!this.isTyping && Math.random() > 0.6) {
        this.triggerChat('react');
      }
    });
  }

  init() {
    // Đếm giờ Idle Time theo giây
    setInterval(() => {
      this.idleTime++;
    }, 1000);

    // Mới vào trang -> Chào hỏi intro
    setTimeout(() => {
      this.triggerChat('intro');
    }, 2000);

    // Vòng lặp hiển thị hội thoại tự động thông minh
    setInterval(() => {
      if (!this.readyToShow && !this.chatBubble.classList.contains('hidden')) {
        // Nếu đang hiện thì tắt đi để một lát sau nói tiếp
        this.chatBubble.classList.add('hidden');
      } else if (this.chatBubble.classList.contains('hidden')) {
        // Nếu đang ẩn thì suy nghĩ xem nên nói câu gì
        this.decideNextMessage();
      }
    }, 5000); // Tốc độ xuất hiện câu thoại (5 giây mỗi nhịp)
  }

  decideNextMessage() {
    // Đủ lâu không tương tác -> Chọn câu bông đùa
    if (this.idleTime > 15) {
      this.triggerChat('fun');
    }
    // Trạng thái bình thường -> Thỉnh thoảng (30%) nhắc chơi Game để lôi kéo sự chú ý
    else if (Math.random() < 0.3 || this.arcadeHoveredContext) {
      this.triggerChat('hint');
    }
    // Còn lại thì nói nhảm bình thường
    else {
      this.triggerChat('idle');
    }
  }

  getSmartRandom(type) {
    const arr = this.messages[type] || this.messages.idle;
    let msg;
    let attempts = 0;

    // Đảm bảo không nói trùng lại những câu nằm trong bộ nhớ ngắn hạn
    do {
      msg = arr[Math.floor(Math.random() * arr.length)];
      attempts++;
    } while (this.lastMessages.includes(msg) && attempts < 10 && arr.length > 1);

    this.lastMessages.push(msg);
    if (this.lastMessages.length > 5) this.lastMessages.shift(); // Quên dần sự kiện cũ

    return msg;
  }

  triggerChat(type) {
    // Dừng gõ phím cũ nếu có
    if (this.typingInterval) {
      clearInterval(this.typingInterval);
      this.typingInterval = null;
    }

    const msg = this.getSmartRandom(type);
    this.typeText(msg);

    this.readyToShow = true;
  }

  typeText(text) {
    this.chatText.textContent = "";
    this.isTyping = true;
    let i = 0;
    let currentText = "";

    // Gõ phím tốc độ 30ms / ký tự
    this.typingInterval = setInterval(() => {
      currentText += text[i];
      this.chatText.textContent = currentText;
      i++;
      if (i >= text.length) {
        clearInterval(this.typingInterval);
        this.typingInterval = null;
        this.isTyping = false;
      }
    }, 20); // Tốc độ đánh máy (Giảm từ 30 xuống 20 để gõ nhanh hơn)
  }

  update(cam, arcadeIsOpen, arcadeHovered) {
    this.arcadeHoveredContext = arcadeHovered;

    // If arcade opens, override and hide
    if (arcadeIsOpen) {
      if (!this.chatBubble.classList.contains('hidden')) {
        this.chatBubble.classList.add('hidden');
      }
      return;
    }

    // If we're scheduled to show and arcade is closed
    if (this.readyToShow) {
      this.chatBubble.classList.remove('hidden');
      this.readyToShow = false; // Đã show rồi thì thôi
    }

    // --- Update Chat Bubble Projection ---
    if (!this.chatBubble.classList.contains('hidden')) {
      const chatPos = new THREE.Vector3();

      // Lấy toạ độ tuyệt đối (World Position) của Ăng-ten (angten)
      if (this.robot.antennaMesh) {
        const box = new THREE.Box3().setFromObject(this.robot.antennaMesh);
        box.getCenter(chatPos);
        chatPos.y = box.max.y + 0.1;
      } else {
        chatPos.copy(this.robot.group.position);
        chatPos.y += 2.4;
      }

      // Quy đổi toạ độ 3D thành 2D
      chatPos.project(cam);

      if (chatPos.z < 1) { // Nằm trước Camera
        const x = (chatPos.x * 0.5 + 0.5) * window.innerWidth;
        const y = -(chatPos.y * 0.5 - 0.5) * window.innerHeight;
        // Bám đuôi siêu mượt
        this.chatBubble.style.transform = `translate(-50%, -100%) translate(${x}px, ${y}px)`;
      } else {
        this.chatBubble.style.transform = `translate(-50%, -100%) translate(-9999px, -9999px)`;
      }
    }
  }
}
