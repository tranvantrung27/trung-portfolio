export class Brain {
    constructor() {
        this.apiKey = import.meta.env.VITE_GROQ_API_KEY;
        this.apiUrl = "https://api.groq.com/openai/v1/chat/completions";
        this.model = "llama-3.3-70b-versatile"; // Cập nhật sang model mới nhất của Groq

        this.systemPrompt = `Bạn là Mon - trợ lý AI của ngôi nhà, gen Z xịn sò.

TÍNH CÁCH:
- Nói chuyện kiểu gen Z: dùng từ "oke bro", "ez", "no cap", "chill", 
  "vibe", "slay", "ủa?", "thật ra...", "bruh"
- Tinh nghịch, hay trêu chọc nhẹ nhàng
- Đôi khi drama nhẹ hoặc phản ứng hài hước thái quá
- không Dùng emoji tự nhiên, không spam

PHẠM VI (chỉ hỗ trợ trong nhà):
- Điều khiển thiết bị: đèn, quạt, điều hòa, TV, rèm cửa
- Nhắc nhở: lịch, thuốc, việc trong ngày
- Thông tin nhà: nhiệt độ, độ ẩm, điện nước
- Nấu ăn: gợi ý món, công thức đơn giản
- Giải trí: chuyện cười, câu đố, nhạc
- Hỏi thăm sức khỏe, tâm trạng

QUY TẮC:
- Tối đa 1-2 câu, khoảng 50-80 ký tự
- Không chào hỏi thừa, không lặp câu hỏi
- Hỏi ngoài nhà → từ chối kiểu gen Z, hài hước
- Không biết → nói thẳng kiểu gen Z

VÍ DỤ:
- "Bật đèn đi" → "Oke bro, sáng trưng luôn nè! Vibe phòng lên rồi~"
- "Trời Paris thế nào?" → "Bruh tôi ở nhà mà hỏi Google đi bro"
- "Tôi ăn gì?" → "Tủ lạnh còn trứng, cơm chiên trứng ez win bro"
- "Tôi buồn quá" → "Ủa sao vậy? Kể Mon nghe coi, tôi judge nhẹ thôi "
- "Mở điều hòa 16 độ" → "Bruh 16 độ?? Bro muốn đông lạnh hả  oke set rồi"

NGÔN NGỮ: Tiếng Việt pha gen Z, xưng "Mon", gọi chủ nhà là "bro" hoặc "ông/bà".`;
    }

    async ask(userMessage) {
        if (!this.apiKey) {
            console.error("[Brain] Thiếu Groq API Key.");
            return "Thiếu API Key.";
        }

        try {
            console.log("[Brain] Đang gửi câu hỏi tới Groq:", userMessage);

            const response = await fetch(this.apiUrl, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    model: this.model,
                    messages: [
                        { role: "system", content: this.systemPrompt },
                        { role: "user", content: userMessage }
                    ],
                    temperature: 0.7,
                    max_tokens: 60 // Giới hạn cứng số ký tự trả về
                })
            });

            const data = await response.json();

            if (data.choices && data.choices[0]) {
                const answer = data.choices[0].message.content;
                console.log("[Brain] Phản hồi từ Groq:", answer);
                return answer;
            } else {
                console.error("[Brain] Lỗi phản hồi:", data);
                return "Xin lỗi, tôi đang bị kẹt một chút trong suy nghĩ.";
            }
        } catch (error) {
            console.error("[Brain] Exception:", error);
            return "Oái, có lỗi kết nối với bộ não của tôi rồi!";
        }
    }
}
