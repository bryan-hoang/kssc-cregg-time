import * as cheerio from "cheerio";
import { defineHandler, proxyRequest } from "nitro/h3";
import { format, parse, sub } from "date-fns";

// The id in the route used to view the "Winter 2026 Basketball 4-on-4 - Monday
// - Recreation" League
const LEAGUE_ID = 94170;
const TEAM_NAME = "The Brick Chuckers";
// e.g., 8:30 PM
const TIME_FORMAT = "h:mm aa";

export default defineHandler(async (event) => {
	// Proxy requests to actual website.
	const targetUrl = new URL("http://kssc.leaguelab.com/");

	targetUrl.pathname = event.url.pathname;
	const response = (await proxyRequest(event, String(targetUrl))) as unknown as Response;

	// Don't modify web-page if not the league that E. Cregg is playing in.
	if (targetUrl.pathname !== `/league/${LEAGUE_ID}/schedule`) {
		return response;
	}

	// Otherwise, apply time adjustments for games E. Cregg is playing in.

	const rawHtml = await new Response(response.body).text();
	const $ = cheerio.load(rawHtml);

	// Get the labels specifying the times of games Emmett is playing in.
	$(`#leagueSchedule > div > table > tbody > tr:contains('${TEAM_NAME}') > td.gameTime.rowLabel`)
		// Subtract half an hour from the scheduled time.
		.text(function (_, time) {
			return format(
				sub(parse(time.trim(), TIME_FORMAT, new Date()), {
					// NOTE: Adjust for Cregg time.
					minutes: 30,
				}),
				TIME_FORMAT,
			);
		});

	// Render the page with adjusted times.
	return new Response($.html(), { headers: { "content-type": "text/html; charset=utf-8" } });
});
