# Шаблон лабораторных работ

Практикум с понятным маршрутом студента, самостоятельными HTML-заданиями, редактируемыми DOCX и CSV. Демонстрация: 4 работы, 3 варианта, 2 семестра, 100 баллов. Для нового курса требуется содержательная адаптация.

## Запуск

Node.js 24 и npm.

```sh
npm ci
npm run dev -- --port 4175
npm run build
```

## Материалы

- src/config.ts — реквизиты курса и ссылки.
- src/data/labs.json — задания и исходные таблицы.
- src/data/subject-areas.json — варианты и профили.
- src/data/methodology.ts — связи, примеры и пояснения шагов.
- public/reports — проверенные Word-формы каждой работы.
- src/lib/labPackage.ts и offline.css — автономные архивы со встроенным оформлением.

Архив студента: HTML, DOCX, CSV. Комплект преподавателя: все работы выбранного периода и все варианты. Закрытые решения не входят в публичную выдачу. DOCX уже подготовлены; npm run build не генерирует Word.

[Правила](docs/TEMPLATE_RULES.md) · [Полная инструкция](docs/AUTHORING_RULES.md) · [Word](docs/REPORT_TEMPLATE.md) · [Инструкция пользователя](docs/USER_GUIDE.md) · [Проверки](docs/QA_PROTOTYPE.md)

Генерация страницы помощи: node scripts/generate-guide.mjs.
