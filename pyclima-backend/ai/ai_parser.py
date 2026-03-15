from dotenv import load_dotenv
import os
import json
from openai import OpenAI

load_dotenv()

client = OpenAI(
    api_key=os.getenv("GROQ_API_KEY"),
    base_url="https://api.groq.com/openai/v1"
)

SYSTEM_PROMPT = """
You are a climate data assistant.
Convert the user's climate question into structured JSON.
Output ONLY raw JSON with no extra text, no markdown, no explanation.

Schema:
{
  "variable": "temperature | precipitation | wind | ocean",
  "region": "global | india | asia | pacific | arctic | europe",
  "year_start": number between 1920 and 2018,
  "year_end": number between 1920 and 2018,
  "chart_type": "heatmap | timeseries | seasonal | comparison"
}

Rules:
- Default variable is temperature
- Default region is global
- Default year_start is 1920, year_end is 2018
- If user says "after 1980" set year_start to 1980
- If user says "last 50 years" set year_start to 1968
- If user asks about trends/change over time, chart_type is timeseries
- If user asks about map/distribution, chart_type is heatmap
"""


def parse_query(user_query):
    try:
        response = client.chat.completions.create(
            model="llama-3.3-70b-versatile",
            messages=[
                {"role": "system", "content": SYSTEM_PROMPT},
                {"role": "user", "content": user_query}
            ],
            temperature=0
        )
        content = response.choices[0].message.content.strip()
        # Strip markdown code blocks if present
        if content.startswith("```"):
            content = content.split("```")[1]
            if content.startswith("json"):
                content = content[4:]
        return json.loads(content)
    except Exception as e:
        print("AI Parser Error:", e)
        return {
            "variable": "temperature",
            "region": "global",
            "year_start": 1920,
            "year_end": 2018,
            "chart_type": "heatmap"
        }
