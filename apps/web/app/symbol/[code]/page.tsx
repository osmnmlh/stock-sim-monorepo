"use client";

import AuthGuard from "../../../components/AuthGuard";
import SymbolClient from "./symbol-client";

export default function Page({ params }: { params: { code: string } }) {
  const symbol = params.code.toUpperCase();
  return (
    <AuthGuard>
      <SymbolClient symbol={symbol} />
    </AuthGuard>
  );
}
