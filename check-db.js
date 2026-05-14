#!/usr/bin/env node

import axios from "axios";
import { readFileSync } from "fs";

const SUPABASE_URL = "https://ukiuxecvybwvngwirjqt.supabase.co";
const ANON_KEY = "sb_publishable_uaXOE8LGq_WvpiSEwfAOGQ_yLbC9uob";

async function checkDatabase() {
  try {
    // Try to query information_schema to list tables
    const response = await axios.get(
      `${SUPABASE_URL}/rest/v1/information_schema.tables?table_schema=eq.public&select=table_name`,
      {
        headers: {
          Authorization: `Bearer ${ANON_KEY}`,
          "Content-Type": "application/json",
        },
      }
    );

    console.log("Tables in public schema:", response.data);
  } catch (error) {
    console.error("Error checking database:", error.message);

    if (error.response?.status === 404) {
      console.log(
        "\nThe enrollments table is missing! We need to apply migrations."
      );
    }
  }
}

checkDatabase();
