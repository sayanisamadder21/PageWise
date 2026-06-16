// src/chatService.ts
import { supabase } from "../supabase";

// ============================================
// TYPES
// ============================================
export interface Chat {
  id: string;
  user_id: string;
  title: string;
  pdf_name: string | null;
  pdf_text?: string | null;
  pdf_char_count: number | null;
  created_at: string;
  last_accessed_at: string;
}

export interface Message {
  id: string;
  chat_id: string;
  user_id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
}

export interface RestoredChat {
  chat: Chat;
  messages: Message[];
}

// ============================================
// CREATE CHAT
// Call this when user sends their first message
// ============================================
export async function createChat(
  userId: string,
  pdfName: string,
  pdfText: string,
  title?: string
): Promise<Chat | null> {
  const { data, error } = await supabase
    .from('chats')
    .insert({
      user_id: userId,
      title: title || pdfName || 'Untitled Chat',
      pdf_name: pdfName,
      pdf_text: pdfText,
      last_accessed_at: new Date().toISOString(),
    })
    .select()
    .single();

  if (error) {
    // Surface the 50k limit error cleanly
    if (error.message.includes('50,000 character limit')) {
      throw new Error('PDF_TOO_LARGE');
    }
    console.error('createChat error:', error);
    return null;
  }

  return data;
}

// ============================================
// LOAD CHATS (sidebar list)
// Sorted by last_accessed_at descending
// ============================================
export async function loadChats(userId: string): Promise<Chat[]> {
  const { data, error } = await supabase
    .from('chats')
    .select('id, user_id, title, pdf_name, pdf_char_count, created_at, last_accessed_at')
    .eq('user_id', userId)
    .order('last_accessed_at', { ascending: false });

  if (error) {
    console.error('loadChats error:', error);
    return [];
  }

  return data || [];
}

// ============================================
// OPEN CHAT (full restore)
// Returns chat metadata + all messages
// ============================================
export async function openChat(
  chatId: string,
  userId: string
): Promise<RestoredChat | null> {
  // Fetch chat (including pdf_text this time)
  const { data: chat, error: chatError } = await supabase
    .from('chats')
    .select('*')
    .eq('id', chatId)
    .eq('user_id', userId)
    .single();

  if (chatError || !chat) {
    console.error('openChat error:', chatError);
    return null;
  }

  // Fetch messages
  const { data: messages, error: msgError } = await supabase
    .from('messages')
    .select('*')
    .eq('chat_id', chatId)
    .order('created_at', { ascending: true });

  if (msgError) {
    console.error('openChat messages error:', msgError);
    return null;
  }

  // Update last_accessed_at
  await updateLastAccessed(chatId);

  return {
    chat,
    messages: messages || [],
  };
}

// ============================================
// SAVE MESSAGE
// Call after every user + assistant message
// ============================================
export async function saveMessage(
  chatId: string,
  userId: string,
  role: 'user' | 'assistant',
  content: string
): Promise<Message | null> {
  const { data, error } = await supabase
    .from('messages')
    .insert({ chat_id: chatId, user_id: userId, role, content })
    .select()
    .single();

  if (error) {
    console.error('saveMessage error:', error);
    return null;
  }

  return data;
}

// ============================================
// UPDATE LAST ACCESSED
// Call when user opens an existing chat
// ============================================
export async function updateLastAccessed(chatId: string): Promise<void> {
  const { error } = await supabase
    .from('chats')
    .update({ last_accessed_at: new Date().toISOString() })
    .eq('id', chatId);

  if (error) {
    console.error('updateLastAccessed error:', error);
  }
}

// ============================================
// DELETE CHAT
// For manual delete from sidebar
// ============================================
export async function deleteChat(chatId: string, userId: string): Promise<boolean> {
  const { error } = await supabase
    .from('chats')
    .delete()
    .eq('id', chatId)
    .eq('user_id', userId);

  if (error) {
    console.error('deleteChat error:', error);
    return false;
  }

  return true;
}

// ============================================
// GET CHAT COUNT
// Use to show "X/10 chats used" in UI
// ============================================
export async function getChatCount(userId: string): Promise<number> {
  const { count, error } = await supabase
    .from('chats')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', userId);

  if (error) {
    console.error('getChatCount error:', error);
    return 0;
  }

  return count || 0;
}