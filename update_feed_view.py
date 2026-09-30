import io
with io.open('frontend/src/components/Chat/GeminiChatLayout.jsx', 'r', encoding='utf-8') as f: c = f.read()
old = '''            onOpenAuth={() => setIsAuthModalOpen(true)}\n            onPhotoSelected={(file) => { handlePhotoSelected(file); }}\n          />'''
new = '''            onOpenAuth={() => setIsAuthModalOpen(true)}\n            onPhotoSelected={(file) => { handlePhotoSelected(file); }}\n            onUserUpdated={(user) => { setCurrentUser(user); setStoredUser(user); }}\n          />'''
c = c.replace(old, new)
with io.open('frontend/src/components/Chat/GeminiChatLayout.jsx', 'w', encoding='utf-8') as f: f.write(c)

