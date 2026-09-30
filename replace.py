import io
with io.open('frontend/src/components/Chat/GeminiChatLayout.jsx', 'r', encoding='utf-8') as f: c = f.read()
c = c.replace("import PhotoJobPreview from './PhotoJobPreview';", "import PhotoJobModal from './PhotoJobModal';")
old_inline = '''              {!isDirect && photoExtraction && (\n                <PhotoJobPreview\n                  extraction={photoExtraction}\n                  onConfirm={handleConfirmPhotoJob}\n                  onDiscard={handleDiscardPhoto}\n                  isSubmitting={isConfirmingPhoto}\n                />\n              )}'''
c = c.replace(old_inline, '')
old_feed = '''onPhotoSelected={(file) => {\n              handlePhotoSelected(file);\n              setFeedMode(false);\n            }}'''
new_feed = '''onPhotoSelected={(file) => { handlePhotoSelected(file); }}'''
c = c.replace(old_feed, new_feed)
old_main = '''      </main>'''
new_main = '''      </main>\n\n      <PhotoJobModal\n        isOpen={Boolean(photoExtraction)}\n        extraction={photoExtraction}\n        onConfirm={handleConfirmPhotoJob}\n        onDiscard={handleDiscardPhoto}\n        isSubmitting={isConfirmingPhoto}\n      />'''
c = c.replace(old_main, new_main)
with io.open('frontend/src/components/Chat/GeminiChatLayout.jsx', 'w', encoding='utf-8') as f: f.write(c)

