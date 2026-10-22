import React, { useState, useRef } from 'react';
import { audio } from '../utils/audio';

interface GeneratedImage {
  id: string;
  url: string;
  prompt: string;
  type: 'generate' | 'edit';
  timestamp: string;
  size: string;
  aspectRatio: string;
}

interface GeminiImageModalProps {
  onClose: () => void;
}

export const GeminiImageModal: React.FC<GeminiImageModalProps> = ({ onClose }) => {
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [prompt, setPrompt] = useState('');
  const [aspectRatio, setAspectRatio] = useState<'1:1' | '16:9' | '4:3' | '3:4' | '9:16'>('1:1');
  const [imageSize, setImageSize] = useState<'1K' | '2K' | '4K'>('1K');

  const [editImageBase64, setEditImageBase64] = useState<string | null>(null);
  const [editImageMime, setEditImageMime] = useState<string>('image/png');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [gallery, setGallery] = useState<GeneratedImage[]>([]);
  const [selectedImage, setSelectedImage] = useState<GeneratedImage | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Suggested preset prompts for the game
  const PRESET_PROMPTS = [
    'Retrato a óleo intimista de Clara segurando um medalhão de pedra azul em uma vila antiga',
    'Conceito artístico da Forja ancestral com brasas vivas e operários trabalhando na noite',
    'O Construtor Ancestral na câmara mais profunda do poço cercado por runas azul-celeste',
    'Panorama de uma vila de mineração aconchegante cercada por pinheiros e neve suave',
  ];

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setEditImageMime(file.type || 'image/png');
    const reader = new FileReader();
    reader.onload = () => {
      setEditImageBase64(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleGenerateOrEdit = async () => {
    if (!prompt.trim()) return;
    setErrorMsg(null);
    setIsLoading(true);
    audio.playClick();

    try {
      if (mode === 'create') {
        const res = await fetch('/api/images/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            aspectRatio,
            imageSize,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro na geração da imagem.');

        const newImg: GeneratedImage = {
          id: `img_${Date.now()}`,
          url: data.imageUrl,
          prompt,
          type: 'generate',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          size: imageSize,
          aspectRatio,
        };

        setGallery((prev) => [newImg, ...prev]);
        setSelectedImage(newImg);
        audio.playRelicFound();
      } else {
        if (!editImageBase64) {
          throw new Error('Selecione ou envie uma imagem base para editar.');
        }

        const res = await fetch('/api/images/edit', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            prompt,
            base64Image: editImageBase64,
            mimeType: editImageMime,
            aspectRatio,
            imageSize,
          }),
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Erro na edição da imagem.');

        const editedImg: GeneratedImage = {
          id: `img_edit_${Date.now()}`,
          url: data.imageUrl,
          prompt,
          type: 'edit',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          size: imageSize,
          aspectRatio,
        };

        setGallery((prev) => [editedImg, ...prev]);
        setSelectedImage(editedImg);
        audio.playRelicFound();
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg(err.message || 'Falha ao processar imagem.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md select-none">
      <div className="bg-[#181410] border border-amber-800/50 w-full max-w-5xl h-[90vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-amber-950/60 bg-[#221a14] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-cyan-950/60 border border-cyan-500/50 flex items-center justify-center text-lg shadow">
              🎨
            </div>
            <div>
              <span className="font-cinzel text-base font-bold text-amber-200 block">
                Ateliê de Imagens Gemini (gemini-nano-banana-2.1)
              </span>
              <span className="text-[11px] text-stone-400">
                Gere e edite artes conceituais, relíquias e ilustrações da vila com resolução 1K, 2K e 4K
              </span>
            </div>
          </div>

          <button
            onClick={() => {
              audio.playClick();
              onClose();
            }}
            className="text-stone-400 hover:text-white px-2.5 py-1 text-sm rounded transition-colors cursor-pointer"
          >
            ✕ Fechar
          </button>
        </div>

        {/* Mode Selector Tabs */}
        <div className="flex border-b border-amber-950/40 bg-[#14100c] px-4 gap-2 text-xs">
          <button
            onClick={() => {
              audio.playClick();
              setMode('create');
            }}
            className={`py-3 px-4 font-semibold transition-colors border-b-2 cursor-pointer ${
              mode === 'create'
                ? 'border-amber-500 text-amber-200 bg-amber-950/20'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Criar Nova Imagem por Texto
          </button>
          <button
            onClick={() => {
              audio.playClick();
              setMode('edit');
            }}
            className={`py-3 px-4 font-semibold transition-colors border-b-2 cursor-pointer ${
              mode === 'edit'
                ? 'border-amber-500 text-amber-200 bg-amber-950/20'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Editar Imagem Existente
          </button>
        </div>

        {/* Main Content (Split: Controls & Gallery) */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Form & Configuration (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            {/* Prompt input */}
            <div>
              <label className="block text-xs font-semibold text-amber-300 mb-1.5">
                {mode === 'create' ? 'Descrição da Imagem (Prompt):' : 'Instrução de Edição:'}
              </label>
              <textarea
                rows={4}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  mode === 'create'
                    ? 'Ex: Pintura aconchegante de uma serraria na floresta à noite, luz de lanternas douradas e fumaça na chaminé...'
                    : 'Ex: Adicione uma lanterna brilhante na mão do personagem e neve caindo suavemente...'
                }
                className="w-full bg-[#1e1712] border border-amber-900/40 text-amber-100 text-xs rounded-lg p-3 focus:outline-none focus:border-amber-500/80 resize-none"
              />
            </div>

            {/* Presets if create mode */}
            {mode === 'create' && (
              <div>
                <span className="text-[11px] text-stone-400 block mb-1">Sugestões do Poço Ancestral:</span>
                <div className="flex flex-col gap-1.5">
                  {PRESET_PROMPTS.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setPrompt(preset)}
                      className="text-left text-[11px] p-2 bg-[#1e1712] hover:bg-amber-950/40 border border-amber-950/50 text-stone-300 rounded transition-colors cursor-pointer"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Image upload if edit mode */}
            {mode === 'edit' && (
              <div className="space-y-2">
                <span className="text-xs font-semibold text-amber-300 block">Imagem para Editar:</span>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="py-2 px-3 bg-amber-900/40 hover:bg-amber-900/70 border border-amber-700/50 text-amber-100 rounded text-xs transition-colors cursor-pointer"
                  >
                    Carregar Imagem Local
                  </button>
                  {selectedImage && (
                    <button
                      type="button"
                      onClick={() => setEditImageBase64(selectedImage.url)}
                      className="py-2 px-3 bg-stone-800 hover:bg-stone-700 text-stone-200 rounded text-xs transition-colors cursor-pointer"
                    >
                      Usar Imagem Selecionada
                    </button>
                  )}
                </div>

                {editImageBase64 && (
                  <div className="mt-2 relative w-24 h-24 rounded-lg overflow-hidden border border-amber-600/50">
                    <img src={editImageBase64} alt="Base" className="w-full h-full object-cover" />
                  </div>
                )}
              </div>
            )}

            {/* Aspect ratio & resolution */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-[11px] font-semibold text-stone-400 mb-1">
                  Proporção (Aspect Ratio):
                </label>
                <select
                  value={aspectRatio}
                  onChange={(e) => setAspectRatio(e.target.value as any)}
                  className="w-full bg-[#1e1712] border border-amber-900/40 text-amber-200 text-xs rounded p-2 focus:outline-none"
                >
                  <option value="1:1">1:1 (Quadrado)</option>
                  <option value="16:9">16:9 (Paisagem / Banners)</option>
                  <option value="4:3">4:3 (Clássico)</option>
                  <option value="3:4">3:4 (Retrato)</option>
                  <option value="9:16">9:16 (Vertical)</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-stone-400 mb-1">
                  Resolução (Nano Banana):
                </label>
                <select
                  value={imageSize}
                  onChange={(e) => setImageSize(e.target.value as any)}
                  className="w-full bg-[#1e1712] border border-amber-900/40 text-amber-200 text-xs rounded p-2 focus:outline-none"
                >
                  <option value="1K">1K (Padrão)</option>
                  <option value="2K">2K (Alta Resolução)</option>
                  <option value="4K">4K (Ultra HD)</option>
                </select>
              </div>
            </div>

            {errorMsg && (
              <div className="p-3 bg-red-950/60 border border-red-800 text-red-200 text-xs rounded-lg">
                {errorMsg}
              </div>
            )}

            {/* Action button */}
            <button
              onClick={handleGenerateOrEdit}
              disabled={isLoading || !prompt.trim()}
              className="w-full py-3 bg-amber-700 hover:bg-amber-600 disabled:opacity-40 text-amber-100 font-cinzel font-bold text-xs sm:text-sm rounded-lg shadow-xl border border-amber-500/50 transition-colors cursor-pointer"
            >
              {isLoading
                ? 'Processando com gemini-nano-banana-2.1...'
                : mode === 'create'
                  ? 'Gerar Imagem com Gemini'
                  : 'Aplicar Edição na Imagem'}
            </button>
          </div>

          {/* Right Column: Preview & Gallery (7 cols) */}
          <div className="lg:col-span-7 flex flex-col space-y-4">
            <span className="font-cinzel text-sm font-semibold text-amber-200">
              Galeria de Ilustrações Criadas ({gallery.length})
            </span>

            {/* Active Preview */}
            <div className="flex-1 min-h-[300px] bg-[#14100c] rounded-xl border border-amber-950/60 p-4 flex flex-col items-center justify-center relative overflow-hidden">
              {isLoading ? (
                <div className="text-center space-y-3">
                  <div className="w-12 h-12 rounded-full border-2 border-amber-500 border-t-transparent animate-spin mx-auto" />
                  <p className="text-xs text-amber-300">
                    O modelo <strong>gemini-nano-banana-2.1</strong> está pintando a obra...
                  </p>
                </div>
              ) : selectedImage ? (
                <div className="w-full h-full flex flex-col items-center justify-between space-y-3">
                  <div className="flex-1 w-full flex items-center justify-center overflow-hidden max-h-[380px]">
                    <img
                      src={selectedImage.url}
                      alt={selectedImage.prompt}
                      className="max-h-full max-w-full rounded-lg object-contain shadow-2xl border border-amber-900/30"
                    />
                  </div>
                  <div className="w-full flex items-center justify-between text-xs pt-2 border-t border-amber-950/40">
                    <p className="text-stone-300 truncate max-w-md text-[11px]" title={selectedImage.prompt}>
                      "{selectedImage.prompt}"
                    </p>
                    <a
                      href={selectedImage.url}
                      download={`poço_ancestral_${Date.now()}.png`}
                      className="px-3 py-1 bg-amber-900/50 hover:bg-amber-800 text-amber-200 rounded text-xs transition-colors cursor-pointer whitespace-nowrap"
                    >
                      Baixar PNG
                    </a>
                  </div>
                </div>
              ) : (
                <div className="text-center text-stone-500 text-xs space-y-2">
                  <span className="text-4xl block">🖼️</span>
                  <span>Nenhuma imagem criada nesta sessão. Preencha a descrição ao lado para gerar.</span>
                </div>
              )}
            </div>

            {/* Thumbnail Strip */}
            {gallery.length > 0 && (
              <div className="flex gap-3 overflow-x-auto py-2">
                {gallery.map((img) => (
                  <button
                    key={img.id}
                    onClick={() => setSelectedImage(img)}
                    className={`w-16 h-16 shrink-0 rounded-lg overflow-hidden border-2 transition-all cursor-pointer ${
                      selectedImage?.id === img.id ? 'border-amber-400 scale-105' : 'border-amber-950/60 opacity-60'
                    }`}
                  >
                    <img src={img.url} alt="thumbnail" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
