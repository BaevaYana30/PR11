
(() => {
    async function init() {
        const about = document.querySelector('.about-section');

        if (
            location.pathname !== '/' ||
            !about ||
            document.querySelector('#turntable-hero')
        ) return;

        const css = document.createElement('link');
        css.rel = 'stylesheet';
        css.href = '/turntable-hero.css';
        document.head.append(css);

        const hero = document.createElement('section');
        hero.id = 'turntable-hero';

        hero.innerHTML = `
            <div class="th-copy">
                <small>✦ THE ART OF ANALOG SOUND</small>
                <h1>Почувствуй музыку.</h1>
                <p>История, записанная на виниле.</p>
                <a href="#vinyl-collection">
                    Открыть коллекцию ↓
                </a>
            </div>

            <div class="th-visual">
                <img src="/vinyl.png"
                     alt="Виниловая пластинка">

                <div class="th-stage"></div>

                <button type="button" hidden>
                    Пауза
                </button>

                <span>SIDE A / 33⅓ RPM</span>
            </div>
        `;

        const catalog = document.querySelector('.catalog');

        if (catalog && !catalog.id) {
            catalog.id = 'vinyl-collection';
        }

        if (catalog) {
            hero.querySelector('a').href = '#' + catalog.id;
        } else {
            hero.querySelector('a').remove();
        }

        about.before(hero);

        try {
            const response = await fetch(
                '/models/turntable.glb',
                { method: 'HEAD' }
            );

            if (
                !response.ok ||
                /text\/html/.test(
                    response.headers.get('content-type') || ''
                )
            ) return;

            if (!customElements.get('model-viewer')) {
                await import(
                    'https://cdn.jsdelivr.net/npm/@google/model-viewer@4.0.0/dist/model-viewer.min.js'
                );
            }

            await customElements.whenDefined('model-viewer');

            const viewer = document.createElement('model-viewer');
            const button = hero.querySelector('button');

            const reduced = matchMedia(
                '(prefers-reduced-motion: reduce)'
            ).matches;

            // Основные настройки модели

            viewer.setAttribute(
                'alt',
                'Анимированный виниловый проигрыватель'
            );

            viewer.setAttribute('camera-controls', '');
            viewer.setAttribute('touch-action', 'pan-y');
            viewer.setAttribute('interaction-prompt', 'none');
            viewer.setAttribute('shadow-intensity', '1');

            // Исправленная камера

           viewer.setAttribute('camera-orbit', '45deg 70deg 1.4m');
          

            viewer.setAttribute(
                'camera-target',
                '0.002m 0.317m 0.010m'
            );

            viewer.setAttribute(
                'field-of-view',
                '45deg'
            );

         viewer.setAttribute('min-camera-orbit', 'auto auto 1.2m');
         
            viewer.setAttribute(
                'max-camera-orbit',
                'auto auto 5m'
            );

            // Объединённая анимация

            viewer.setAttribute(
                'animation-name',
                'Vinyl Motion'
            );

            // Загрузка модели

            viewer.addEventListener('load', () => {
                hero.classList.add('th-loaded');

                if (viewer.availableAnimations.length) {
                    button.hidden = false;

                    button.textContent = reduced
                        ? 'Воспроизвести'
                        : 'Пауза';

                    if (!reduced) {
                        viewer.play();
                    }
                }
            });

            // Резервное изображение при ошибке

            viewer.addEventListener('error', () => {
                hero.classList.remove('th-loaded');
                button.hidden = true;
            });

            // Управление анимацией

            button.onclick = () => {
                if (viewer.paused) {
                    viewer.play();
                    button.textContent = 'Пауза';
                } else {
                    viewer.pause();
                    button.textContent = 'Воспроизвести';
                }
            };

           const glbResponse = await fetch('/models/turntable.glb');
const buffer = await glbResponse.arrayBuffer();
const view = new DataView(buffer);

const jsonLength = view.getUint32(12, true);

const json = JSON.parse(
    new TextDecoder().decode(
        new Uint8Array(buffer, 20, jsonLength)
    )
);

const combined = {
    name: 'FullAnimation',
    channels: [],
    samplers: []
};

for (const animation of json.animations) {
    const offset = combined.samplers.length;

    combined.samplers.push(...animation.samplers);

    for (const channel of animation.channels) {
        combined.channels.push({
            ...channel,
            sampler: channel.sampler + offset
        });
    }
}

json.animations = [combined];

const encoded = new TextEncoder().encode(
    JSON.stringify(json)
);

const paddedLength = Math.ceil(encoded.length / 4) * 4;

const binary = new Uint8Array(
    buffer,
    20 + jsonLength
);

const totalLength = 20 + paddedLength + binary.length;

const result = new Uint8Array(totalLength);
const header = new DataView(result.buffer);

header.setUint32(0, 0x46546C67, true);
header.setUint32(4, 2, true);
header.setUint32(8, totalLength, true);
header.setUint32(12, paddedLength, true);
header.setUint32(16, 0x4E4F534A, true);

result.fill(32, 20, 20 + paddedLength);
result.set(encoded, 20);
result.set(binary, 20 + paddedLength);

viewer.animationName = 'FullAnimation';

viewer.src = URL.createObjectURL(
    new Blob([result], {
        type: 'model/gltf-binary'
    })
);

            hero.querySelector('.th-stage').append(viewer);

        } catch (error) {
            console.warn('3D model unavailable:', error);
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            init,
            { once: true }
        );
    } else {
        init();
    }
})();
