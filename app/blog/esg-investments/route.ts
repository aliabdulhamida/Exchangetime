import { NextResponse } from "next/server";

export async function GET() {
	return NextResponse.redirect(new URL("/blog/esg-investitionen", process.env.NEXT_PUBLIC_SITE_URL || "http://localhost"), {
		status: 308,
	});
}

