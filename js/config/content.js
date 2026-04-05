/**
 * CONTENT CONFIG — Single source of truth for all dynamic content.
 * To update links, projects, or skills — edit THIS file only.
 */

export const social = {
  github: 'https://github.com/tranvantrung27',
  email: 'trantrung04.contact@gmail.com',
};

export const projects = [
  {
    title: 'Leaf Disease Detection',
    desc: 'Tập dữ liệu nông nghiệp chất lượng cao cho huấn luyện mô hình AI nhận diện bệnh trên lá cây.',
    image: './assets/projects/leaf-disease.webp',
    tags: ['AI', 'Computer Vision', 'Dataset'],
    links: {},
  },
  {
    title: 'Predictive Analytics',
    desc: 'Mô hình AI dự đoán theo thời gian thực, tối ưu hóa hiệu suất hệ thống.',
    image: './assets/projects/predictive-analytics.webp',
    tags: ['AI', 'Machine Learning', 'Data'],
    links: {},
  },
  {
    title: 'Flutter Smart IoT',
    desc: 'Ứng dụng di động cao cấp điều khiển thiết bị thông minh qua IoT.',
    image: './assets/projects/flutter-iot.webp',
    tags: ['Flutter', 'IoT', 'ESP32'],
    links: {},
  },
];

export const skillGroups = [
  {
    title: 'AI & Machine Learning',
    icon: 'brain',
    skills: ['Deep Learning', 'Computer Vision', 'PyTorch', 'TensorFlow', 'Python'],
  },
  {
    title: 'Mobile & Web',
    icon: 'code',
    skills: ['Flutter', 'React', 'Three.js', 'JavaScript', 'HTML/CSS'],
  },
  {
    title: 'Tools & Platforms',
    icon: 'tool',
    skills: ['IoT / ESP32', 'Git', 'ChatGPT', 'Claude', 'Gemini'],
  },
];

export const contact = {
  subtitle: 'Đang tìm kiếm cơ hội trong lĩnh vực AI và phát triển phần mềm.',
  cta: 'Liên hệ ngay',
};

export const footer = {
  copyright: `© ${new Date().getFullYear()} Trung. Tất cả quyền được bảo lưu.`,
};
