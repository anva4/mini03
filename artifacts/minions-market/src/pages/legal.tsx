import { useState } from "react";
import { ArrowLeft, Mail, MapPin, Globe, Shield, CreditCard, FileText, RefreshCw, Lock, AlertTriangle, ChevronDown, ChevronUp, ExternalLink } from "lucide-react";

type SectionKey = "terms" | "payment" | "refund" | "privacy" | "delivery" | "prohibited";

const SECTIONS: { key: SectionKey; icon: React.ElementType; title: string }[] = [
  { key: "terms",     icon: FileText,      title: "Пользовательское соглашение" },
  { key: "payment",   icon: CreditCard,    title: "Порядок оплаты" },
  { key: "refund",    icon: RefreshCw,     title: "Политика возврата" },
  { key: "delivery",  icon: Shield,        title: "Порядок исполнения заказа" },
  { key: "prohibited",icon: AlertTriangle, title: "Запрещённые товары и действия" },
  { key: "privacy",   icon: Lock,          title: "Политика конфиденциальности" },
];

function Accordion({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="bg-card rounded-2xl border border-border/40 overflow-hidden transition-all">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-4 text-left hover:bg-secondary/30 transition-colors"
      >
        <span className="flex items-center gap-2.5 font-semibold text-sm">
          <Icon className="w-4 h-4 text-primary flex-shrink-0" />
          {title}
        </span>
        {open ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-4 text-sm text-muted-foreground space-y-2.5 leading-relaxed border-t border-border/30 pt-3">
          {children}
        </div>
      )}
    </div>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="leading-relaxed">{children}</p>;
}
function H({ children }: { children: React.ReactNode }) {
  return <p className="font-semibold text-foreground mt-3 mb-1">{children}</p>;
}
function Li({ children }: { children: React.ReactNode }) {
  return <p className="pl-3 border-l-2 border-primary/30">{children}</p>;
}

export default function LegalPage() {
  return (
    <div className="flex flex-col pb-10">

      {/* Header */}
      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 glass border-b border-border/30 bg-background/95 backdrop-blur">
        <button onClick={() => window.history.back()} className="p-1 -ml-1 rounded-lg hover:bg-secondary transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold">Правовая информация</h1>
      </div>

      <div className="flex flex-col gap-3 p-4">

        {/* Реквизиты */}
        <div className="bg-card rounded-2xl border border-border/40 p-4 flex flex-col gap-3">
          <h2 className="font-semibold flex items-center gap-2 text-sm">
            <Globe className="w-4 h-4 text-primary" /> О сервисе
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <Globe className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Minions Market</p>
                <p className="text-muted-foreground">Игровой маркетплейс — платформа для купли-продажи цифровых игровых товаров</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <MapPin className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Адрес</p>
                <p className="text-muted-foreground">г. Ташкент, Республика Узбекистан</p>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Mail className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Email</p>
                <a href="mailto:anvarikromov778@gmail.com" className="text-primary hover:underline">anvarikromov778@gmail.com</a>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <ExternalLink className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Поддержка Telegram</p>
                <a href="https://t.me/for_ewer0721" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">@for_ewer0721</a>
              </div>
            </div>
          </div>
        </div>

        {/* Способы оплаты */}
        <div className="bg-card rounded-2xl border border-border/40 p-4 flex flex-col gap-3">
          <h2 className="font-semibold flex items-center gap-2 text-sm">
            <CreditCard className="w-4 h-4 text-primary" /> Способы оплаты
          </h2>
          <p className="text-xs text-muted-foreground">Платёжные операции проводятся через сертифицированных провайдеров. Данные карт не хранятся на сервере.</p>
          <div className="space-y-2">

            {/* RuKassa */}
            <div className="flex items-start gap-3 p-3 bg-secondary/30 rounded-xl">
              <div className="w-10 h-10 bg-blue-500/15 rounded-xl flex items-center justify-center flex-shrink-0 border border-blue-500/20">
                <span className="text-blue-400 font-bold text-xs">RU</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">RuKassa</p>
                <p className="text-xs text-muted-foreground mt-0.5">Банковские карты РФ (Visa, MasterCard, МИР), СБП, криптовалюта, электронные кошельки</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {["СБП", "МИР", "Visa", "MC", "USDT", "BTC", "Qiwi"].map(m => (
                    <span key={m} className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded-md">{m}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Lava */}
            <div className="flex items-start gap-3 p-3 bg-secondary/30 rounded-xl">
              <div className="w-10 h-10 bg-orange-500/15 rounded-xl flex items-center justify-center flex-shrink-0 border border-orange-500/20">
                <span className="text-orange-400 font-bold text-xs">LA</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">Lava</p>
                <p className="text-xs text-muted-foreground mt-0.5">Банковские карты, электронные кошельки, СБП, мобильные платежи</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {["СБП", "МИР", "Visa", "MC", "ЮMoney", "QIWI"].map(m => (
                    <span key={m} className="text-[10px] bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded-md">{m}</span>
                  ))}
                </div>
              </div>
            </div>

            {/* Enot.io */}
            <div className="flex items-start gap-3 p-3 bg-secondary/30 rounded-xl">
              <div className="w-10 h-10 bg-green-500/15 rounded-xl flex items-center justify-center flex-shrink-0 border border-green-500/20">
                <span className="text-green-400 font-bold text-xs">EN</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-sm">Enot.io</p>
                <p className="text-xs text-muted-foreground mt-0.5">Карты РФ и СНГ, P2P переводы, крипто, ЮMoney</p>
                <div className="flex flex-wrap gap-1.5 mt-2">
                  {["Карты РФ", "СНГ", "ЮMoney", "P2P", "Крипто"].map(m => (
                    <span key={m} className="text-[10px] bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded-md">{m}</span>
                  ))}
                </div>
              </div>
            </div>

          </div>
          <div className="bg-secondary/20 rounded-xl p-3 text-xs text-muted-foreground">
            <p className="font-medium text-foreground mb-1">🔒 Безопасность платежей</p>
            <p>Все транзакции защищены протоколом SSL/TLS. Мы не имеем доступа к реквизитам карт. Оплата проходит на защищённой странице платёжного провайдера.</p>
          </div>
        </div>

        {/* Аккордеон секций */}
        <Accordion title="Пользовательское соглашение" icon={FileText}>
          <H>1. Общие положения</H>
          <P>Настоящее Пользовательское соглашение (далее — «Соглашение») регулирует отношения между администрацией платформы Minions Market и пользователями сервиса.</P>
          <P>Используя платформу, вы подтверждаете, что ознакомились с настоящим Соглашением и принимаете его условия в полном объёме.</P>

          <H>2. Условия использования</H>
          <Li>Минимальный возраст для регистрации и совершения сделок — 18 лет.</Li>
          <Li>Один пользователь вправе иметь только один аккаунт. Создание дублирующих аккаунтов запрещено.</Li>
          <Li>Пользователь несёт ответственность за сохранность данных своего аккаунта.</Li>
          <Li>Передача аккаунта третьим лицам запрещена.</Li>

          <H>3. Статус платформы</H>
          <P>Minions Market является информационным посредником между покупателями и продавцами цифровых товаров. Платформа не является стороной в сделках между пользователями и не несёт ответственности за действия третьих лиц.</P>

          <H>4. Ответственность пользователя</H>
          <Li>Продавец гарантирует достоверность описания товара и правомерность его продажи.</Li>
          <Li>Покупатель обязуется использовать приобретённые товары в рамках действующего законодательства.</Li>
          <Li>Любые претензии по качеству товара направляются через систему диспутов платформы.</Li>

          <H>5. Блокировка аккаунтов</H>
          <P>Администрация вправе без предупреждения заблокировать аккаунт пользователя при нарушении настоящего Соглашения, правил платформы или законодательства.</P>

          <H>6. Изменение условий</H>
          <P>Администрация вправе изменять условия Соглашения в одностороннем порядке. Актуальная версия всегда доступна на данной странице. Продолжение использования платформы означает согласие с изменениями.</P>
        </Accordion>

        <Accordion title="Порядок оплаты" icon={CreditCard}>
          <H>Принятые способы оплаты</H>
          <P>Платформа принимает оплату через платёжные шлюзы RuKassa, Lava и Enot.io. Доступные методы зависят от выбранного провайдера и могут включать: банковские карты (МИР, Visa, Mastercard), СБП, ЮMoney, криптовалюту и P2P-переводы.</P>

          <H>Процесс пополнения баланса</H>
          <Li>Перейдите в раздел «Кошелёк» и выберите сумму пополнения.</Li>
          <Li>Выберите удобный платёжный метод.</Li>
          <Li>Вы будете перенаправлены на защищённую страницу оплаты провайдера.</Li>
          <Li>После успешной оплаты баланс пополняется автоматически в течение нескольких минут.</Li>

          <H>Минимальная сумма пополнения</H>
          <P>Минимальная сумма разового пополнения составляет 10 рублей. Максимальная сумма может быть ограничена конкретным платёжным провайдером.</P>

          <H>Комиссии</H>
          <P>Платформа не взимает дополнительных комиссий за пополнение баланса. Комиссия платёжного провайдера, если предусмотрена, указывается на странице оплаты перед подтверждением транзакции.</P>

          <H>Валюта расчётов</H>
          <P>Все расчёты на платформе осуществляются в российских рублях (RUB). При оплате из других стран конвертация производится по курсу платёжного провайдера.</P>

          <H>Статусы транзакций</H>
          <Li><b>Ожидает</b> — платёж инициирован, ожидается подтверждение от провайдера.</Li>
          <Li><b>Выполнен</b> — средства зачислены на баланс.</Li>
          <Li><b>Отменён</b> — оплата не прошла или была отменена пользователем.</Li>
        </Accordion>

        <Accordion title="Политика возврата" icon={RefreshCw}>
          <H>Основания для возврата</H>
          <P>Возврат денежных средств возможен в следующих случаях:</P>
          <Li>Цифровой товар не был передан покупателю в течение 3 (трёх) рабочих дней с момента оплаты.</Li>
          <Li>Полученный товар существенно не соответствует описанию, опубликованному продавцом.</Li>
          <Li>Продавец не вышел на связь в течение 48 часов после совершения сделки.</Li>
          <Li>Факт мошенничества со стороны продавца подтверждён администрацией.</Li>

          <H>Как оформить возврат</H>
          <Li>Откройте спор (диспут) в разделе «Мои сделки» в течение 72 часов с момента покупки.</Li>
          <Li>Опишите проблему и приложите доказательства (скриншоты, переписку).</Li>
          <Li>Администрация рассматривает обращение в течение 3–5 рабочих дней.</Li>
          <Li>При подтверждении основания средства возвращаются на баланс платформы.</Li>

          <H>Сроки возврата на карту</H>
          <P>Возврат средств на банковскую карту или электронный кошелёк осуществляется в течение 3–10 рабочих дней в зависимости от платёжного провайдера. Обратная операция производится тем же способом, которым была произведена оплата.</P>

          <H>Невозможность возврата</H>
          <Li>Товар был получен и использован покупателем.</Li>
          <Li>Обращение подано позднее 72 часов с момента покупки без уважительной причины.</Li>
          <Li>Отсутствуют доказательства нарушения со стороны продавца.</Li>
        </Accordion>

        <Accordion title="Порядок исполнения заказа" icon={Shield}>
          <H>Тип товаров</H>
          <P>Платформа специализируется на продаже цифровых товаров: игровые аккаунты, игровая валюта, скины, предметы, подписки, ключи активации и другие виртуальные ценности.</P>

          <H>Процесс передачи товара</H>
          <Li>После оплаты покупатель получает доступ к данным товара в разделе «Мои сделки».</Li>
          <Li>Для товаров с автодоставкой данные предоставляются мгновенно после подтверждения платежа.</Li>
          <Li>Для товаров с ручной доставкой продавец обязан передать данные в течение 24 часов.</Li>

          <H>Подтверждение получения</H>
          <P>Покупатель обязан подтвердить получение и соответствие товара в течение 72 часов с момента передачи данных. При отсутствии реакции сделка завершается автоматически в пользу продавца.</P>

          <H>Гарантийный период</H>
          <P>Продавец несёт ответственность за работоспособность переданного товара в течение 24 часов с момента получения. Если в этот период выявлены несоответствия, покупатель вправе открыть диспут.</P>
        </Accordion>

        <Accordion title="Запрещённые товары и действия" icon={AlertTriangle}>
          <H>Запрещённые товары</H>
          <Li>Аккаунты, полученные незаконным путём (взлом, фишинг, социальная инженерия).</Li>
          <Li>Читы, боты, программы для обхода античит-систем и эксплойты.</Li>
          <Li>Товары, нарушающие законодательство Российской Федерации или международные нормы.</Li>
          <Li>Предложения, вводящие покупателя в заблуждение относительно свойств товара.</Li>
          <Li>Генераторы ключей, краденые подарочные карты и активационные коды.</Li>

          <H>Запрещённые действия</H>
          <Li>Проведение сделок в обход платформы с целью уклонения от комиссии.</Li>
          <Li>Накрутка рейтинга и отзывов через фиктивные сделки.</Li>
          <Li>Создание множества аккаунтов для обхода блокировки.</Li>
          <Li>Угрозы, шантаж и давление на других пользователей.</Li>
          <Li>Размещение рекламы сторонних ресурсов без согласования с администрацией.</Li>

          <H>Ответственность</H>
          <P>Нарушение настоящих правил влечёт немедленную блокировку аккаунта и заморозку средств до завершения проверки. Администрация вправе обратиться в правоохранительные органы при выявлении признаков мошенничества.</P>
        </Accordion>

        <Accordion title="Политика конфиденциальности" icon={Lock}>
          <H>Собираемые данные</H>
          <P>В рамках работы платформы мы обрабатываем следующие данные:</P>
          <Li>Имя пользователя и Telegram ID (при авторизации через Telegram).</Li>
          <Li>История транзакций и совершённых сделок.</Li>
          <Li>Технические данные: IP-адрес, тип устройства, браузер — для обеспечения безопасности.</Li>

          <H>Использование данных</H>
          <Li>Обеспечение работоспособности и безопасности платформы.</Li>
          <Li>Разрешение споров между пользователями.</Li>
          <Li>Выявление и предотвращение мошеннических действий.</Li>
          <Li>Улучшение сервиса и пользовательского опыта.</Li>

          <H>Передача данных третьим лицам</H>
          <P>Мы не продаём и не передаём ваши данные третьим лицам в коммерческих целях. Данные могут быть раскрыты исключительно по требованию уполномоченных государственных органов в соответствии с действующим законодательством.</P>
          <P>Платёжные провайдеры (RuKassa, Lava, Enot.io) обрабатывают платёжные данные в соответствии с их собственной политикой конфиденциальности и PCI DSS стандартами.</P>

          <H>Хранение данных</H>
          <P>Данные хранятся на защищённых серверах. Вы вправе запросить удаление своего аккаунта и связанных данных, обратившись в поддержку. Транзакционная история может храниться в течение срока, установленного финансовым законодательством.</P>

          <H>Cookie и аналитика</H>
          <P>Платформа использует технические cookie, необходимые для авторизации и корректной работы сервиса. Аналитические данные собираются в обезличенном виде.</P>
        </Accordion>

        {/* Дата и копирайт */}
        <div className="text-center space-y-1 mt-2">
          <p className="text-xs text-muted-foreground">
            Документ актуален на {new Date().toLocaleDateString("ru-RU", { day: "2-digit", month: "long", year: "numeric" })}
          </p>
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} Minions Market. Все права защищены.
          </p>
        </div>
      </div>
    </div>
  );
}
