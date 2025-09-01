# ChatView Autoscroll Fix - Test Plan

## Overview
This document outlines the test scenarios to verify that the autoscroll functionality in the ChatView component is working correctly for the main agent conversation.

## Changes Made

### 1. Added Message Type Tracking
- Added `lastMessageTypeRef` to track whether the last message was from 'user' or 'agent'
- This helps identify when the agent starts responding after a user message

### 2. Improved Streaming Autoscroll Logic
- Reset `disableAutoScrollRef` when streaming starts for main agent
- Removed unnecessary `isAtBottom` check from streaming condition
- Added immediate scroll with 'auto' behavior followed by smooth scroll

### 3. Enhanced Message Update Autoscroll
- Automatically re-enable autoscroll when agent starts responding to user
- Simplified conditions - only check for subagents and manual scroll disable flag

### 4. Better Scroll Event Handling
- Only disable autoscroll for significant scroll movements (>10px)
- Distinguish between scrolling up and scrolling down while not at bottom

## Test Scenarios

### Test 1: Basic Autoscroll During Agent Response
**Steps:**
1. Start a new conversation with the agent
2. Send a message/task to the agent
3. Observe as the agent responds

**Expected Result:**
- Chat should automatically scroll to show new content as the agent types
- Scrolling should be smooth and continuous

### Test 2: Manual Scroll Interruption
**Steps:**
1. While agent is responding, scroll up manually
2. Continue observing the agent's response

**Expected Result:**
- Autoscroll should stop when you scroll up
- Chat should remain at your scrolled position

### Test 3: Re-enabling Autoscroll
**Steps:**
1. After manually scrolling up, scroll back to the bottom
2. Send another message to the agent

**Expected Result:**
- When agent starts responding to new message, autoscroll should resume
- Chat should follow the new content

### Test 4: Streaming Content
**Steps:**
1. Trigger a long response from the agent (e.g., ask for detailed explanation)
2. Observe the scrolling behavior during streaming

**Expected Result:**
- Content should scroll smoothly as it streams in
- No jumping or stuttering

### Test 5: Subagent Behavior
**Steps:**
1. Trigger a task that spawns subagents
2. Observe scrolling during subagent execution
3. Observe when control returns to main agent

**Expected Result:**
- Autoscroll should work for subagent updates (if not manually scrolled)
- When subagents complete, autoscroll should resume for main agent

### Test 6: Follow-up Questions
**Steps:**
1. Trigger a follow-up question from the agent
2. Click on a suggestion or type a response
3. Observe scrolling when agent continues

**Expected Result:**
- Autoscroll should resume when agent responds after follow-up

### Test 7: Small Scroll Movements
**Steps:**
1. While agent is responding, make very small scroll adjustments (<10px)
2. Observe if autoscroll continues

**Expected Result:**
- Small adjustments should not disable autoscroll
- Only significant scrolling should disable it

## Verification Checklist

- [ ] Autoscroll works during initial agent response
- [ ] Autoscroll works during streaming content
- [ ] Manual scroll up disables autoscroll
- [ ] Scrolling to bottom re-enables autoscroll
- [ ] New agent responses re-enable autoscroll
- [ ] Subagent completion properly restores autoscroll
- [ ] Follow-up responses trigger autoscroll
- [ ] Small scroll movements don't break autoscroll

## Console Logging

The implementation includes console logs for debugging. Look for these messages:
- `[ChatView] Streaming started for main agent, enabling autoscroll`
- `[ChatView] Agent started responding, re-enabling autoscroll`
- `[ChatView] User scrolled manually, disabling autoscroll`
- `[ChatView] All subagents completed, re-enabling autoscroll for main agent`

## Notes

- The fix prioritizes user control - if user scrolls away, respect that choice
- Autoscroll automatically resumes when agent starts a new response
- The implementation is more forgiving of minor scroll adjustments
- Streaming content gets special handling for smooth continuous scrolling