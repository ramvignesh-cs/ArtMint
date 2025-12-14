import { NextRequest, NextResponse } from "next/server";
import { verifyIdToken } from "@/lib/firebase-admin";
import { addAssetOwner } from "@/lib/contentstack-am2";
import { addOwnerSchema } from "@/lib/validations";
import { log } from "@/lib/logger";

/**
 * POST /api/assets/[assetUid]/owner
 * Add an owner to an asset (used after purchase)
 * 
 * Body:
 * - user_id: Buyer user ID
 * - user_name: Buyer name (optional)
 * - purchase_date: ISO timestamp (optional, defaults to now)
 * - transaction_id: Transaction ID
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ assetUid: string }> }
) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await verifyIdToken(token);

    if (!decodedToken) {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const { assetUid } = await params;

    if (!assetUid) {
      return NextResponse.json({ error: "Asset UID is required" }, { status: 400 });
    }

    // Parse and validate request body
    const body = await request.json();
    
    const validation = addOwnerSchema.safeParse({
      user_id: body.user_id,
      user_name: body.user_name || null,
      purchase_date: body.purchase_date || new Date().toISOString(),
      transaction_id: body.transaction_id,
    });

    if (!validation.success) {
      return NextResponse.json(
        { error: "Invalid owner data", details: validation.error.errors },
        { status: 400 }
      );
    }

    const validated = validation.data;

    // Add owner to asset
    const asset = await addAssetOwner(assetUid, {
      user_id: validated.user_id,
      user_name: validated.user_name ?? null,
      purchase_date: validated.purchase_date ?? new Date().toISOString(),
      transaction_id: validated.transaction_id,
    });

    return NextResponse.json({
      success: true,
      notice: "Owner added successfully",
      asset,
    });
  } catch (error: any) {
    log.error("Add owner error", error);
    
    if (error.message.includes("not found")) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }

    return NextResponse.json(
      { error: error.message || "Failed to add owner" },
      { status: 500 }
    );
  }
}

