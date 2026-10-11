import type { Funnel } from '@/types/editor';
import type { Exporter } from './index';
import { countdownScript, escapeMarkup, portableStyles, renderPortableFunnel } from './portable-markup';

export class LaravelExporter implements Exporter {
    export(funnel: Funnel): string {
        return `@extends('layouts.app')

@section('title', ${JSON.stringify(funnel.name)})

@push('styles')
<style>${portableStyles}</style>
@endpush

@section('content')
<main class="of-page" style="font-family:${escapeMarkup(funnel.settings.fontFamily || 'Inter, sans-serif')};background:${escapeMarkup(funnel.settings.backgroundColor)}">
${renderPortableFunnel(funnel, 'html')}
</main>
${countdownScript}
@endsection`;
    }
}
