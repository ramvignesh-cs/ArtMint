# 🎨 ArtMint

**Own the Digital Original** — A digital art selling platform where buying digital art truly makes it yours.

![Next.js](https://img.shields.io/badge/Next.js-15-black?style=flat-square&logo=next.js)
![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)
![TailwindCSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat-square&logo=tailwind-css)

## ✨ Features

- **🔐 Authentication**: Firebase Auth with Email/Password, Google, and Apple OAuth
- **👛 Digital Wallet**: Immutable ledger system for tracking purchases and transactions
- **🖼️ Gallery**: Browse and filter digital artworks by category and artist
- **🎨 Artist Dashboard**: Upload and publish artwork to the marketplace
- **💳 Secure Payments**: Stripe integration for seamless checkout
- **📜 Ownership Tracking**: Asset metadata stored in Contentstack with verifiable ownership history

## 🛠️ Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 15 (App Router), React 18, TypeScript |
| Styling | TailwindCSS, shadcn/ui components |
| Authentication | Firebase Auth |
| Database | Firebase Firestore |
| CMS | Contentstack (Asset Management 2.0) |
| Payments | Stripe |
| Animations | Framer Motion |

## 📁 Project Structure

```
src/
├── app/
│   ├── (auth)/              # Authentication routes
│   │   ├── login/
│   │   └── signup/
│   ├── api/                 # API Route handlers
│   │   ├── auth/
│   │   ├── wallet/
│   │   ├── artworks/
│   │   └── purchase/
│   ├── art/[assetUid]/      # Artwork detail page
│   ├── artist/upload/       # Artist upload page
│   ├── dashboard/           # User dashboard
│   ├── gallery/             # Public gallery
│   ├── artists/             # Artists listing
│   └── success/             # Purchase success
├── components/
│   ├── shared/              # Shared components
│   └── ui/                  # shadcn/ui components
├── context/                 # React contexts
├── hooks/                   # Custom hooks
└── lib/                     # Utility functions & clients
    ├── firebase.ts          # Firebase client
    ├── firebase-admin.ts    # Firebase Admin SDK
    ├── stripe.ts            # Stripe client
    ├── contentstack.ts      # Contentstack CDA/CMA
    ├── wallet.ts            # Wallet utilities
    └── validations.ts       # Zod schemas
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Firebase project with Firestore enabled
- Contentstack account
- Stripe account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/artmint.git
   cd artmint
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure environment variables**
   
   Copy `.env.example` to `.env.local` and fill in your credentials:
   ```bash
   cp .env.example .env.local
   ```

4. **Run the development server**
   ```bash
   npm run dev
   ```

5. Open [http://localhost:3000](http://localhost:3000)

## ⚙️ Environment Variables

```env
# Firebase Configuration (Client)
NEXT_PUBLIC_FIREBASE_API_KEY="..."
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN="..."
NEXT_PUBLIC_FIREBASE_PROJECT_ID="..."
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET="..."
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID="..."
NEXT_PUBLIC_FIREBASE_APP_ID="..."

# Firebase Admin (Server) - Base64 encoded service account JSON
# To get this:
# 1. Go to Firebase Console > Project Settings > Service Accounts
# 2. Click "Generate New Private Key" to download the JSON file
# 3. Encode it to base64: cat serviceAccountKey.json | base64
# 4. Paste the result here
FIREBASE_SERVICE_ACCOUNT="..."

# Optional: Use Firebase Emulator for local development
# NEXT_PUBLIC_USE_FIREBASE_EMULATOR="true"

# Contentstack
CONTENTSTACK_REGION="NA"
CONTENTSTACK_API_KEY="..."
CONTENTSTACK_DELIVERY_TOKEN="..."
CONTENTSTACK_MANAGEMENT_TOKEN="..."
CONTENTSTACK_ENVIRONMENT="prod"

# Contentstack Asset Management 2.0
CONTENTSTACK_SPACE_UID=""
CONTENTSTACK_ORGANIZATION_UID=""
CONTENTSTACK_WORKSPACE=""
CONTENTSTACK_LOCALE=""

# Stripe
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY="pk_test_..."
STRIPE_SECRET_KEY="sk_test_..."
STRIPE_WEBHOOK_SECRET="whsec_..."

# Stripe Test Cards (for testing payments):
# Success: 4242 4242 4242 4242
# Decline: 4000 0000 0000 0002
# Requires 3D Secure: 4000 0025 0000 3155
# Any future expiry date (e.g., 12/34)
# Any 3-digit CVC (e.g., 123)

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
```

## 📊 Data Models

### Firestore Schema

```
users/{uid}
├── email: string
├── displayName: string
├── role: "buyer" | "artist"
├── walletId: string
├── photoURL?: string
├── createdAt: timestamp
└── updatedAt: timestamp

wallets/{walletId}
├── userId: string
├── balance: number
├── transactions: [
│   ├── id: string (TX_XXX format)
│   ├── type: "DEBIT" | "CREDIT"
│   ├── amount: number
│   ├── timestamp: string
│   └── reference: {
│       ├── assetUid?: string
│       ├── stripePaymentId?: string
│       └── description?: string
│   }
├── createdAt: timestamp
└── updatedAt: timestamp

user_assets/{userId}
├── userId: string
├── assets: [
│   ├── assetUid: string
│   ├── transactionId: string
│   ├── purchaseDate: string (ISO timestamp)
│   ├── price: number
│   ├── currency: string
│   └── addedAt: timestamp
├── createdAt: timestamp
└── updatedAt: timestamp
```

### Contentstack Asset Metadata

```json
{
  "title": "Artwork Name",
  "description": "...",
  "category": "Abstract",
  "artistId": "user_uid",
  "artistName": "Artist Name",
  "price": 2500,
  "currency": "USD",
  "status": "published" | "sold",
  "owners": [
    {
      "userId": "buyer_uid",
      "userName": "Buyer Name",
      "purchaseDate": "ISO timestamp",
      "transactionId": "TX_XXX"
    }
  ],
  "createdAt": "ISO timestamp",
  "tags": ["tag1", "tag2"]
}
```

## 🔄 Purchase Flow

1. **Buyer clicks "Buy"** → API creates Stripe Checkout session
2. **Stripe handles payment** → Redirects to success page on completion
3. **Stripe Webhook fires** → `checkout.session.completed` event
4. **Backend processes**:
   - Adds DEBIT transaction to buyer's wallet (immutable append)
   - Updates Contentstack asset metadata with new owner
   - Revalidates artwork page
5. **Buyer sees** → Ownership verified in their collection

## 🎨 Brand Identity

- **Primary Color**: Mint Green (`#00F5A0`)
- **Background**: Dark Gallery (`#0D0D0D`)
- **Accent**: Purple gradients for premium feel
- **Typography**: Geist Sans/Mono
- **Theme**: Dark premium gallery aesthetic

## 🚢 Deployment

### Contentstack Launch

This project is configured for Contentstack Launch deployment:

```bash
npm run build
```

The `next.config.ts` includes `output: "standalone"` for serverless compatibility.

### Stripe Webhook Setup

1. Create a webhook endpoint in Stripe Dashboard
2. Point to: `https://yourdomain.com/api/purchase/webhook`
3. Select event: `checkout.session.completed`
4. Copy webhook secret to `STRIPE_WEBHOOK_SECRET`

## 📡 API Endpoints

### Contentstack Asset Management 2.0

#### Upload Asset
**POST** `/api/assets/upload`

Upload a new asset to Contentstack Asset Management 2.0.

**Headers:**
- `Authorization: Bearer <firebase_id_token>`

**Body (multipart/form-data):**
- `file`: The asset file (required)
- `title`: Asset title (optional, defaults to filename)
- `description`: Asset description (optional)
- `category`: Category (required)
- `price`: Price (required, number)
- `currency`: Currency code, e.g., "USD" (required, defaults to "USD")
- `status`: "sold" | "sale" | "resale" (required)
- `tags`: JSON array of tags (optional)

**Response:**
```json
{
  "success": true,
  "notice": "Asset created successfully",
  "asset": {
    "uid": "am84ab20746dd86e24",
    "file_name": "ArtMint_Logo.png",
    "url": "https://...",
    "custom_metadata": {
      "art_metadata": {
        "artist_uid": "...",
        "artist_name": "...",
        "price": 2500,
        "currency": "USD",
        "status": "sale",
        "category": "Abstract",
        "owners": []
      }
    }
  }
}
```

#### Get Asset
**GET** `/api/assets/[assetUid]`

Get asset details by UID.

**Response:**
```json
{
  "success": true,
  "notice": "Asset retrieved successfully",
  "asset": { ... }
}
```

#### Update Asset Metadata
**PUT** `/api/assets/[assetUid]`

Update asset metadata.

**Headers:**
- `Authorization: Bearer <firebase_id_token>`

**Body (JSON):**
```json
{
  "title": "New Title",
  "description": "New description",
  "tags": ["tag1", "tag2"],
  "price": 3000,
  "currency": "USD",
  "category": "Abstract",
  "status": "sale"
}
```

#### Add Owner
**POST** `/api/assets/[assetUid]/owner`

Add an owner to an asset (used after purchase).

**Headers:**
- `Authorization: Bearer <firebase_id_token>`

**Body (JSON):**
```json
{
  "user_id": "buyer_uid",
  "user_name": "Buyer Name",
  "purchase_date": "2025-12-11T07:15:26.432Z",
  "transaction_id": "TX_XXX"
}
```

#### Publish Asset
**POST** `/api/assets/[assetUid]/publish`

Publish an asset (set status to "sale"). Only artists can publish their own assets.

**Headers:**
- `Authorization: Bearer <firebase_id_token>`

## 🔐 Security Notes

- All Asset Management 2.0 (write) operations happen server-side only
- Firebase ID tokens verified on every protected route
- Stripe webhook signatures validated
- Wallet ledger is append-only (immutable pattern)
- No sensitive keys in client bundle

## 📝 Future Enhancements

- [ ] Collection showcase for buyers
- [ ] Artist analytics dashboard
- [ ] Secondary market for resales
- [ ] Social features (likes, follows)
- [ ] Notification system
- [ ] Advanced search with filters
- [ ] Bulk upload for artists

## 📄 License

MIT License - see [LICENSE](LICENSE) for details.

---

**Art. Owned. Forever.** 🌟

