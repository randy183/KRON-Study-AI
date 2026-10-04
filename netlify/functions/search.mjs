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
        // SEARCH QUERY
        // =========================

        let searchQuery = question;

        if (mode === "waec") {

            searchQuery =
                "WAEC Nigeria " +
                subject +
                " " +
                question;

        }

        // =========================
        // FREE SERP SEARCH
        // =========================

        const searchUrl =
            "https://freeserp.ai/api.php" +
            "?index=web" +
            "&q=" +
            encodeURIComponent(searchQuery) +
            "&size=8";

        const searchResponse =
            await fetch(searchUrl);

        if (!searchResponse.ok) {
            return new Response(
                JSON.stringify({
                    error:
                        "Web search failed."
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

        const searchData =
            await searchResponse.json();

        const rawResults =
            searchData.results ||
            searchData.web ||
            [];

        const results =
            rawResults.map(item => ({
                title:
                    item.title || "",

                snippet:
                    item.snippet ||
                    item.description ||
                    "",

                url:
                    item.url || ""
            }));

        // =========================
        // OPENROUTER KEY
        // =========================

        const apiKey =
            process.env.OPENROUTER_API_KEY;

        if (!apiKey) {
            return new Response(
                JSON.stringify({
                    error:
                        "OpenRouter API key is missing."
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
        // PREPARE SEARCH RESULTS
        // =========================

        const sourceText =
            results
                .map((item, index) => {

                    return (
                        "SOURCE " +
                        (index + 1) +
                        "\nTitle: " +
                        item.title +
                        "\nSnippet: " +
                        item.snippet +
                        "\nURL: " +
                        item.url
                    );

                })
                .join("\n\n");


        // =========================
        // AI INSTRUCTIONS
        // =========================

        let systemPrompt = "";


        if (mode === "web") {

            systemPrompt =
                "You are KRON General Web Search. " +
                "Answer the user's general question using the supplied web results. " +
                "This is a separate general web search and is NOT a WAEC search. " +
                "Find the results that actually relate to the exact question. " +
                "Ignore unrelated results. " +
                "Combine useful information into one clear answer. " +
                "For current events, prefer recent and reliable information. " +
                "Do not invent facts. " +
                "If the search results are insufficient, say so clearly.";

        }


        else if (mode === "quiz") {

            systemPrompt =
                "You are KRON Quiz Generator. " +
                "Create a WAEC-style multiple-choice quiz for the requested subject. " +
                "Use the web results as supporting research. " +
                "Do not use unrelated search results. " +
                "Create clear questions suitable for Nigerian secondary-school students. " +
                "Return ONLY valid JSON using this structure: " +
                "{\"questions\":[{\"question\":\"...\",\"options\":[\"A\",\"B\",\"C\",\"D\"],\"answer\":0,\"explanation\":\"...\"}]} " +
                "The answer must be the zero-based number of the correct option.";

        }


        else {

            systemPrompt =
                "You are KRON Study AI, a Nigerian secondary-school study assistant. " +
                "The user is asking a WAEC-related educational question. " +
                "Use the supplied web results as supporting research. " +
                "Focus on the exact question and subject. " +
                "Ignore unrelated search results. " +
                "Explain the answer clearly and simply. " +
                "For mathematics and calculations, solve the exact problem yourself. " +
                "Do not copy an unrelated search result. " +
                "Do not invent information.";

        }


        // =========================
        // ASK OPENROUTER
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
                            "application/json"
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
                                    "Mode: " +
                                    mode +
                                    "\n\nSubject: " +
                                    subject +
                                    "\n\nUser request:\n" +
                                    question +
                                    "\n\nWeb search results:\n" +
                                    sourceText
                            }

                        ]

                    })
                }
            );


        // =========================
        // CHECK AI RESPONSE
        // =========================

        if (!aiResponse.ok) {

            const errorText =
                await aiResponse.text();

            return new Response(
                JSON.stringify({

                    error:
                        "OpenRouter request failed.",

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

                        quiz: quiz,

                        results: results

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
        // NORMAL ANSWER
        // =========================

        return new Response(
            JSON.stringify({

                mode: mode,

                subject: subject,

                question: question,

                answer: answer,

                results: results

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
                    "Something went wrong.",

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
