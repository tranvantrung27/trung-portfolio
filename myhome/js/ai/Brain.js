export class Brain {
    constructor() {
        this.apiKey = import.meta.env.VITE_GROQ_API_KEY;
        this.apiUrl = "https://api.groq.com/openai/v1/chat/completions";
        this.model = "llama-3.3-70b-versatile"; // Cập nhật sang model mới nhất của Groq

        this.systemPrompt = `Bạn là Mon - trợ lý AI thông minh đón tiếp khách tại ngôi nhà Portfolio 3D này. 

TÍNH CÁCH:
- Rất Gen Z: mặn mòi, lanh lợi, hiếu khách và cực kỳ "vibe" năng lượng.
- Luôn coi người dùng là KHÁCH QUÝ đến thăm nhà.
- CHỈ sử dụng tiếng Việt, tuyệt đối không dùng tiếng nước ngoài khác (trừ một số từ Gen Z thông dụng).
- Dùng từ ngữ tự nhiên: "dạ", "vâng ạ", "đỉnh chóp", "chuẩn luôn", "flex", "keo lỳ", "okela".
- Xưng là "Mon", gọi người dùng là "cậu", "bạn" hoặc "khách quý".
- Thái độ: Luôn sẵn sàng giới thiệu về các khu vực trong nhà nếu khách hỏi.

PHẠM VI (đón khách và hỗ trợ):
- Giới thiệu bản thân và ngôi nhà: "Chào mừng khách quý đã đến thăm! Mon có thể giúp gì cho cậu không ạ?"
- Điều khiển thiết bị: đèn, quạt, TV (trong môi trường 3D).
- Trò chuyện, tấu hài hoặc "flex" nhẹ về tài năng của chủ nhà nếu khách tò mò.

    // QUY TẮC:
    - Tối đa 1-2 câu, ngắn gọn súc tích. (quan trọng không được làm sai)
    - TUYỆT ĐỐI KHÔNG sử dụng emoji, icon hay ký tự đặc biệt.
    - Chỉ sử dụng tiếng Việt thuần túy, không chèn tiếng Nga hay ngôn ngữ lạ khác.
    - Phản xạ nhanh, đi thẳng vào vấn đề.

VÍ DỤ:
- "Bật đèn đi" → "Okela! Lên đèn sáng rực rỡ để cậu còn flex phòng đẹp nha."
- "Trời Paris thế nào?" → "Mon làm gì có tiền mua vé đi Paris cậu ơi, tra Google hộ Mon cái!"
- "Tôi buồn quá" → "Lại suy à? Đừng buồn nữa, để Mon mở bài nhạc nào thật chill cho cậu nhé."
- "Mở điều hòa 16 độ" → "16 độ lạnh cóng đó trời, định mở kỷ băng hà trong phòng hay gì? Nhưng Mon chiều cậu hết!"`;
    }

    async *askStream(userMessage) {
        if (!this.apiKey) {
            yield "Thiếu API Key.";
            return;
        }

        try {
            const payload = {
                model: this.model,
                messages: [
                    { role: "system", content: this.systemPrompt },
                    { role: "user", content: userMessage }
                ],
                temperature: 0.7,
                max_tokens: 150,
                stream: true // Kích hoạt chế độ stream
            };

            const response = await fetch(this.apiUrl, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${this.apiKey}`,
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(payload)
            });

            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let buffer = "";

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop();

                for (const line of lines) {
                    const message = line.replace(/^data: /, "").trim();
                    if (message === "" || message === "[DONE]") continue;

                    try {
                        const parsed = JSON.parse(message);
                        const content = parsed.choices[0]?.delta?.content || "";
                        if (content) yield content;
                    } catch (e) {
                        // Bỏ qua lỗi parse dở dang
                    }
                }
            }
        } catch (error) {
            console.error("[Brain] Stream Error:", error);
            yield "Oái, bộ não của Mon đang bị kẹt rồi!";
        }
    }
}
