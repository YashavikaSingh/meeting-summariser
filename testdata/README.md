# Test Data for Meeting Summarizer

This directory contains sample meeting transcripts that can be used to test the Meeting Summarizer system. These sample transcripts represent various types of meetings across different domains.

## File Format

Each transcript file follows this general format:

```
Meeting Topic: [Meeting Name]
Meeting Date: [Date]
Start Time: [Time] [Timezone]
Meeting Duration: [Duration]
Participants: [List of Names]
Transcription Enabled: Yes

[Timestamp] [Speaker Name]:
[Speech Content]

[Timestamp] [Speaker Name]:
[Speech Content]

...
```

## Sample Transcripts

The following sample transcripts are included:

1. **budget_review_meeting.txt** - A financial meeting reviewing quarterly budget performance and planning future allocations.

2. **customer_feedback_meeting.txt** - A meeting analyzing customer feedback from various channels and determining action items.

3. **design_review_meeting.txt** - A design team reviewing mockups and technical concerns for a product.

4. **product_launch_meeting.txt** - A cross-functional team planning the timeline and responsibilities for a product launch.

5. **product_strategy_meeting.txt** - A short Q2 product strategy sync discussing roadmap, ownership, and blockers.

6. **research_findings_meeting.txt** - A detailed presentation of user research findings and recommendations for healthcare systems.

7. **team_retrospective_meeting.txt** - A sprint retrospective discussing what went well, what didn't, and improvement opportunities.

## Usage

You can process these files in several ways:

1. **Via the Demo Script**:
   ```bash
   cd backend
   python demo.py --transcript ../testdata/product_strategy_meeting.txt
   ```

2. **Via the Batch Loader**:
   ```bash
   cd backend
   python load_test_data.py
   ```

3. **Via the API**:
   Use the file upload feature in the frontend application or directly call the API endpoint.

## Creating Your Own Test Data

You can create your own test data files following the same format as the provided examples. Make sure to include:

- Meeting metadata at the top (topic, date, participants, etc.)
- Timestamp and speaker name for each utterance
- Clear formatting for easy parsing

Place your custom transcript files in this directory, and they can be processed using the same methods as the included samples. 