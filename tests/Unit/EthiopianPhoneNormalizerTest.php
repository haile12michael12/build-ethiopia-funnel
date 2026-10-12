<?php

use App\Services\EthiopianPhoneNormalizer;

it('normalizes Ethiopian mobile number formats to E.164', function (string $input, string $expected) {
    expect(app(EthiopianPhoneNormalizer::class)->normalize($input))->toBe($expected);
})->with([
    ['0911223344', '+251911223344'],
    ['+251 911 223344', '+251911223344'],
    ['00251911223344', '+251911223344'],
    ['0711223344', '+251711223344'],
]);

it('rejects invalid Ethiopian mobile numbers', function (string $input) {
    expect(app(EthiopianPhoneNormalizer::class)->normalize($input))->toBeNull();
})->with([
    '12345',
    '+251 111 223344',
    '+1 555 555 0100',
]);
