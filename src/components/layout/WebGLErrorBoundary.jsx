'use client';

import { Component, createRef } from 'react';
import WebGLFallback from './WebGLFallback';

function detectWebGL() {
    if (typeof window === 'undefined') return true;
    try {
        const canvas = document.createElement('canvas');
        return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
    } catch {
        return false;
    }
}

export default class WebGLErrorBoundary extends Component {
    constructor(props) {
        super(props);
        this.state = {
            hasError: false,
            errorType: null, // 'no-webgl' | 'render-error' | 'context-lost'
        };
        this.containerRef = createRef();
        this._observer = null;
    }

    componentDidMount() {
        if (!detectWebGL()) {
            this.setState({ hasError: true, errorType: 'no-webgl' });
            return;
        }
        this.attachContextLossHandlers();
    }

    attachContextLossHandlers() {
        const container = this.containerRef.current;
        if (!container) return;

        // R3F가 Canvas DOM을 생성할 때까지 MutationObserver로 감시
        this._observer = new MutationObserver(() => {
            const canvas = container.querySelector('canvas');
            if (canvas && !canvas.__ctxLossAttached) {
                canvas.__ctxLossAttached = true;

                canvas.addEventListener('webglcontextlost', (e) => {
                    e.preventDefault();
                    this.setState({ hasError: true, errorType: 'context-lost' });
                });

                canvas.addEventListener('webglcontextrestored', () => {
                    this.setState({ hasError: false, errorType: null });
                });

                this._observer.disconnect();
            }
        });

        this._observer.observe(container, { childList: true, subtree: true });

        // 이미 Canvas가 존재하는 경우도 처리
        const existingCanvas = container.querySelector('canvas');
        if (existingCanvas && !existingCanvas.__ctxLossAttached) {
            existingCanvas.__ctxLossAttached = true;
            existingCanvas.addEventListener('webglcontextlost', (e) => {
                e.preventDefault();
                this.setState({ hasError: true, errorType: 'context-lost' });
            });
            existingCanvas.addEventListener('webglcontextrestored', () => {
                this.setState({ hasError: false, errorType: null });
            });
            this._observer.disconnect();
        }
    }

    componentWillUnmount() {
        if (this._observer) this._observer.disconnect();
    }

    static getDerivedStateFromError() {
        return { hasError: true, errorType: 'render-error' };
    }

    componentDidCatch(error, info) {
        console.error('[WebGL Error Boundary]', error, info);
    }

    handleRetry = () => {
        this.setState({ hasError: false, errorType: null });
    };

    render() {
        if (this.state.hasError) {
            const { fallbackProps = {} } = this.props;
            return (
                <WebGLFallback
                    weekTitle={fallbackProps.weekTitle}
                    conceptSummary={fallbackProps.conceptSummary}
                    errorType={this.state.errorType}
                    onRetry={this.state.errorType !== 'no-webgl' ? this.handleRetry : undefined}
                />
            );
        }

        return (
            <div ref={this.containerRef} style={{ width: '100%', height: '100%' }}>
                {this.props.children}
            </div>
        );
    }
}
