export default async (req) => {

    if (req.method !== "POST") {
        return new Response(
            JSON.stringify({
                error: "Method not allowed"
            }),
            {
                status: 405,
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );
    }

    try {

        const body = await req.json();

        const mode =
            String(body.mode || "waec").trim();

        const subject =
            String(body.subject || "").trim();

        const question =
            String(body.question || "").trim();

        if (!question) {
            return new Response(
                JSON.stringify({
                    error:
                        "Question or search text is required."
                }),
                {
                    status: 400,
                    headers: {
                        "Content-Type":
                            "application/json"
                    }
                }
            );
        }

        // =========================
        // SAFETY FILTER
        // =========================

        const blockedWords = [
            "porn",
            "pornography",
            "xxx",
            "nude",
            "nudes",
            "betting",
            "casino",
            "gambling",
            "sports betting",
            "1xbet",
            "stake",
            "cocaine",
            "heroin"
        ];

        const lowerQuestion =
            question.toLowerCase();

        if (
            mode === "web" &&
            blockedWords.some(
                word =>
                    lowerQuestion.includes(word)
            )
        ) {
            return new Response(
                JSON.stringify({
                    error:
                        "KRON cannot search for this type of content."
                }),
                {
                    status: 400,
                    headers: {
                        "Content-Type":
                            "application/json"
                    }
                }
            );
        }

        // =========================
        // OPENROUTER API KEY
        // =========================

        const apiKey =
            process.env.OPENROUTER_API_KEY;

        if (!apiKey) {
            return new Response(
                JSON.stringify({
                    error:
                        "OPENROUTER_API_KEY is missing from Netlify."
                }),
                {
                    status: 500,
                    headers: {
                        "Content-Type":
                            "application/json"
                    }
                }
            );
    }
                // =========================
        // AI INSTRUCTIONS
        // =========================

        let systemPrompt = "";

        if (mode === "quiz") {

            systemPrompt =
                "You are KRON Quiz Generator. " +
                "Create a WAEC-style multiple-choice quiz. " +
                "The quiz must be suitable for Nigerian secondary-school students. " +
                "Use the requested subject and topic. " +
                "Create clear and educational questions. " +
                "Each question must have exactly four options. " +
                "Return ONLY valid JSON in this exact structure: " +
                "{\"questions\":[{\"question\":\"...\",\"options\":[\"A\",\"B\",\"C\",\"D\"],\"answer\":0,\"explanation\":\"...\"}]} " +
                "The answer must be the zero-based number of the correct option.";

        }

        else if (mode === "web") {

            systemPrompt =
                "You are KRON General Search AI. " +
                "Answer the user's question clearly and accurately. " +
                "This is a general knowledge request. " +
                "Do not pretend that you performed a live web search. " +
                "If the question requires current information that you cannot reliably know, " +
                "clearly tell the user that the information may need verification.";

        }

        else {

            systemPrompt =
                "You are KRON Study AI, a Nigerian secondary-school study assistant. " +
                "Help students understand WAEC-related subjects. " +
                "Explain answers clearly and simply. " +
                "Use the requested subject and question. " +
                "For mathematics and calculations, solve the exact problem carefully. " +
                "Do not invent information. " +
                "Teach the student instead of simply giving unexplained answers.";
        }

        // =========================
        // OPENROUTER REQUEST
        // =========================

        const aiResponse =
            await fetch(
                "https://openrouter.ai/api/v1/chat/completions",
                {
                    method: "POST",

                    headers: {
                        "Authorization":
                            "Bearer " + apiKey,

                        "Content-Type":
                            "application/json",

                        "HTTP-Referer":
                            "https://kron-study.netlify.app",

                        "X-Title":
                            "KRON Study"
                    },

                    body: JSON.stringify({

                        model:
                            "openai/gpt-oss-20b:free",

                        messages: [

                            {
                                role: "system",

                                content:
                                    systemPrompt
                            },

                            {
                                role: "user",

                                content:
                                    "Subject: " +
                                    subject +
                                    "\n\nUser request:\n" +
                                    question
                            }

                        ]

                    })
                }
            );
                // =========================
        // CHECK OPENROUTER RESPONSE
        // =========================

        if (!aiResponse.ok) {

            const errorText =
                await aiResponse.text();

            return new Response(
                JSON.stringify({
                    error:
                        "OpenRouter request failed.",

                    status:
                        aiResponse.status,

                    details:
                        errorText
                }),
                {
                    status: 502,

                    headers: {
                        "Content-Type":
                            "application/json"
                    }
                }
            );
        }

        const aiData =
            await aiResponse.json();

        let answer =
            aiData.choices?.[0]?.message?.content ||
            "";

        if (!answer) {

            return new Response(
                JSON.stringify({
                    error:
                        "OpenRouter returned an empty answer.",

                    details:
                        JSON.stringify(aiData)
                }),
                {
                    status: 502,

                    headers: {
                        "Content-Type":
                            "application/json"
                    }
                }
            );
        }

        // =========================
        // QUIZ RESPONSE
        // =========================

        if (mode === "quiz") {

            try {

                answer =
                    answer
                        .replace(/```json/gi, "")
                        .replace(/```/g, "")
                        .trim();

                const quiz =
                    JSON.parse(answer);

                return new Response(
                    JSON.stringify({
                        mode: "quiz",
                        quiz: quiz
                    }),
                    {
                        status: 200,

                        headers: {
                            "Content-Type":
                                "application/json"
                        }
                    }
                );

            } catch (error) {

                return new Response(
                    JSON.stringify({
                        error:
                            "KRON could not create the quiz.",

                        details:
                            error.message
                    }),
                    {
                        status: 502,

                        headers: {
                            "Content-Type":
                                "application/json"
                        }
                    }
                );
            }
    }
                // =========================
        // NORMAL AI RESPONSE
        // =========================

        return new Response(
            JSON.stringify({
                mode: mode,
                subject: subject,
                question: question,
                answer: answer
            }),
            {
                status: 200,

                headers: {
                    "Content-Type":
                        "application/json"
                }
            }
        );

    } catch (error) {

        return new Response(
            JSON.stringify({
                error:
                    "KRON encountered an unexpected error.",

                details:
                    error.message
            }),
            {
                status: 500,

                headers: {
                    "Content-Type":
                        "application/json"
                }
            }
        );
    }
};


// =========================
// NETLIFY FUNCTION PATH
// =========================

export const config = {
    path: "/api/search"
};
