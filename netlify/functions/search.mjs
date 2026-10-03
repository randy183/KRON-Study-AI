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

        const subject =
            String(body.subject || "").trim();

        const question =
            String(body.question || "").trim();

        if (!subject || !question) {
            return new Response(
                JSON.stringify({
                    error:
                        "Subject and question are required."
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

        const searchQuery =
            subject +
            " " +
            question +
            " WAEC Nigeria";

        const url =
            "https://freeserp.ai/api.php" +
            "?index=web" +
            "&q=" +
            encodeURIComponent(searchQuery) +
            "&size=8";

        const response =
            await fetch(url);

        if (!response.ok) {
            return new Response(
                JSON.stringify({
                    error:
                        "Free web search failed."
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

        const data =
            await response.json();

        const rawResults =
            data.results ||
            data.web ||
            [];

        const results =
            rawResults.map(function(item) {

                return {
                    title:
                        item.title || "",

                    snippet:
                        item.snippet ||
                        item.description ||
                        "",

                    url:
                        item.url || ""
                };

            });

        return new Response(
            JSON.stringify({
                subject: subject,
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
                    "Something went wrong while searching the web."
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

export const config = {
    path: "/api/search"
};
