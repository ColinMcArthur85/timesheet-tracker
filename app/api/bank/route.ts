import { NextRequest, NextResponse } from "next/server";
import { getBankTransactions, createBankTransaction, deleteBankTransaction } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const transactions = await getBankTransactions("default");
    
    // Calculate total balance
    const balance_hours = transactions.reduce((acc: number, tx: any) => {
      const amount = parseFloat(tx.amount_hours);
      return tx.type === "BANK" ? acc + amount : acc - amount;
    }, 0);

    return NextResponse.json({
      balance_hours,
      transactions,
    });
  } catch (error) {
    console.error("Error in GET /api/bank:", error);
    return NextResponse.json({ error: "Failed to fetch bank data" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { amount_hours, type, pay_period_start, notes } = body;

    if (!amount_hours || isNaN(amount_hours) || amount_hours <= 0) {
      return NextResponse.json({ error: "Invalid amount of hours" }, { status: 400 });
    }

    if (!["BANK", "WITHDRAW"].includes(type)) {
      return NextResponse.json({ error: "Invalid transaction type" }, { status: 400 });
    }

    // Check balance if withdrawing
    if (type === "WITHDRAW") {
      const currentTransactions = await getBankTransactions("default");
      const currentBalance = currentTransactions.reduce((acc: number, tx: any) => {
        const amount = parseFloat(tx.amount_hours);
        return tx.type === "BANK" ? acc + amount : acc - amount;
      }, 0);

      if (parseFloat(amount_hours) > currentBalance) {
        return NextResponse.json({ error: "Insufficient banked hours balance" }, { status: 400 });
      }
    }

    const transaction = await createBankTransaction(
      "default",
      parseFloat(amount_hours),
      type,
      pay_period_start,
      notes
    );

    // Fetch updated list and balance
    const updatedTransactions = await getBankTransactions("default");
    const balance_hours = updatedTransactions.reduce((acc: number, tx: any) => {
      const amount = parseFloat(tx.amount_hours);
      return tx.type === "BANK" ? acc + amount : acc - amount;
    }, 0);

    return NextResponse.json({
      transaction,
      balance_hours,
      transactions: updatedTransactions,
    });
  } catch (error: any) {
    console.error("Error in POST /api/bank:", error);
    return NextResponse.json({ error: error?.message || "Failed to process bank transaction" }, { status: 500 });
  }
}


export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const idParam = searchParams.get("id");

    if (!idParam) {
      return NextResponse.json({ error: "Transaction ID is required" }, { status: 400 });
    }

    const id = parseInt(idParam, 10);
    await deleteBankTransaction(id);

    const updatedTransactions = await getBankTransactions("default");
    const balance_hours = updatedTransactions.reduce((acc: number, tx: any) => {
      const amount = parseFloat(tx.amount_hours);
      return tx.type === "BANK" ? acc + amount : acc - amount;
    }, 0);

    return NextResponse.json({
      balance_hours,
      transactions: updatedTransactions,
    });
  } catch (error) {
    console.error("Error in DELETE /api/bank:", error);
    return NextResponse.json({ error: "Failed to delete bank transaction" }, { status: 500 });
  }
}
