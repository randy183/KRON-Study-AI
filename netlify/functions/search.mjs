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
                    error: "Subject and question are required."
                }),
                {
                    status: 400,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        const apiKey =
            process.env.BRAVE_SEARCH_API_KEY;

        if (!apiKey) {
            return new Response(
                JSON.stringify({
                    error:
                        "Search API key is not connected yet."
                }),
                {
                    status: 500,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        const searchQuery =
            subject +
            " " +
            question +
            " Nigerian secondary school WAEC";

        const url =
            "https://api.search.brave.com/res/v1/web/search" +
            "?q=" +
            encodeURIComponent(searchQuery) +
            "&count=8";

        const response = await fetch(url, {
            headers: {
                "Accept": "application/json",
                "X-Subscription-Token": apiKey
            }
        });

        if (!response.ok) {

            return new Response(
                JSON.stringify({
                    error:
                        "Web search failed."
                }),
                {
                    status: 502,
                    headers: {
                        "Content-Type": "application/json"
                    }
                }
            );
        }

        const data =
            await response.json();

        const results =
            data.web &&
            data.web.results
                ? data.web.results.map(function(item) {

                    return {
                        title:
                            item.title || "",

                        snippet:
                            item.description || "",

                        url:
                            item.url || ""
                    };

                })
                : [];

        return new Response(
            JSON.stringify({
                subject: subject,
                results: results
            }),
            {
                status: 200,
                headers: {
                    "Content-Type": "application/json"
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
                    "Content-Type": "application/json"
                }
            }
        );
    }
};

export const config = {
    path: "/api/search"
};
