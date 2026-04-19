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
    image: './assets/projects/leaf-disease.png',
    tags: ['AI', 'Computer Vision', 'Dataset'],
    tech: ['Python', 'TensorFlow', 'OpenCV', 'Kaggle', 'FastAPI'],
    longDesc: 'Dự án tập trung vào việc xây dựng và tối ưu hóa các mô hình học sâu (CNN) để nhận diện tự động các loại bệnh trên lá cây thông qua hình ảnh. Hệ thống giúp nông dân phát hiện sớm mầm bệnh, từ đó đưa ra biện pháp xử lý kịp thời, giảm thiểu thiệt hại mùa màng.',
    links: { demo: '#' },
  },
  {
    title: 'Predictive Analytics',
    desc: 'Mô hình AI dự đoán theo thời gian thực, tối ưu hóa hiệu suất hệ thống.',
    image: './assets/projects/predictive-analytics.png',
    tags: ['AI', 'Machine Learning', 'Data'],
    tech: ['Scikit-learn', 'Pandas', 'Flask', 'Power BI', 'SQL'],
    longDesc: 'Phát triển hệ thống dự báo sử dụng các thuật toán Regression và Time Series để phân tích xu hướng dữ liệu lịch sử. Ứng dụng giúp doanh nghiệp đưa ra các quyết định chiến lược dựa trên dữ liệu thực tế, tối ưu hóa chuỗi cung ứng và dự đoán hành vi khách hàng.',
    links: { demo: '#' },
  },
  {
    title: 'Flutter Smart IoT',
    desc: 'Ứng dụng di động cao cấp điều khiển thiết bị thông minh qua IoT.',
    image: './assets/projects/flutter-iot.png',
    tags: ['Flutter', 'IoT', 'ESP32'],
    tech: ['Flutter', 'Dart', 'Firebase', 'MQTT', 'C++'],
    longDesc: 'Giải pháp nhà thông minh tích hợp ứng dụng di động Flutter và phần cứng ESP32. Người dùng có thể điều khiển thiết bị điện, giám sát nhiệt độ, độ ẩm và nhận cảnh báo an ninh theo thời gian thực thông qua giao thức MQTT ổn định.',
    links: { demo: '#' },
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
