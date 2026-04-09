import { useState } from "react";
import {
  ArrowLeft, Mail, MapPin, Globe, Shield, CreditCard,
  FileText, RefreshCw, Lock, AlertTriangle, ChevronDown,
  ChevronUp, ExternalLink, Truck, Clock, Phone,
} from "lucide-react";

function Accordion({ title, icon: Icon, children, defaultOpen = false }: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-card rounded-2xl border border-border/40 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-3 px-4 py-4 text-left hover:bg-secondary/30 transition-colors"
      >
        <span className="flex items-center gap-2.5 font-semibold text-sm">
          <Icon className="w-4 h-4 text-primary flex-shrink-0" />
          {title}
        </span>
        {open
          ? <ChevronUp className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          : <ChevronDown className="w-4 h-4 text-muted-foreground flex-shrink-0" />}
      </button>
      {open && (
        <div className="px-4 pb-5 text-sm text-muted-foreground space-y-2.5 leading-relaxed border-t border-border/30 pt-3">
          {children}
        </div>
      )}
    </div>
  );
}

const H = ({ children }: { children: React.ReactNode }) => (
  <p className="font-semibold text-foreground mt-4 mb-1 first:mt-0">{children}</p>
);
const P = ({ children }: { children: React.ReactNode }) => (
  <p className="leading-relaxed">{children}</p>
);
const Li = ({ children }: { children: React.ReactNode }) => (
  <p className="pl-3 border-l-2 border-primary/30 leading-relaxed">{children}</p>
);

export default function LegalPage() {
  return (
    <div className="flex flex-col pb-10">

      <div className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 glass border-b border-border/30 bg-background/95 backdrop-blur">
        <button onClick={() => window.history.back()} className="p-1 -ml-1 rounded-lg hover:bg-secondary transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="font-bold leading-tight">Правовая информация</h1>
          <p className="text-[10px] text-muted-foreground">Публичная оферта и политика сервиса</p>
        </div>
      </div>

      <div className="flex flex-col gap-3 p-4">

        {/* Реквизиты */}
        <div className="bg-card rounded-2xl border border-border/40 p-4 flex flex-col gap-3">
          <h2 className="font-semibold flex items-center gap-2 text-sm">
            <Globe className="w-4 h-4 text-primary" /> Сведения о сервисе
          </h2>
          <div className="space-y-3 text-sm">
            <div className="flex items-start gap-2">
              <Globe className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Minions Market</p>
                <p className="text-muted-foreground">Игровой маркетплейс — площадка купли-продажи цифровых игровых товаров и услуг</p>
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
                <p className="font-medium">Email поддержки</p>
                <a href="mailto:anvarikromov778@gmail.com" className="text-primary hover:underline break-all">
                  anvarikromov778@gmail.com
                </a>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Phone className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Telegram-поддержка</p>
                <a href="https://t.me/for_ewer0721" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                  @for_ewer0721
                </a>
              </div>
            </div>
            <div className="flex items-start gap-2">
              <Clock className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="font-medium">Режим работы поддержки</p>
                <p className="text-muted-foreground">Ежедневно, 09:00 – 23:00 (GMT+5)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Способы оплаты */}
        <div className="bg-card rounded-2xl border border-border/40 p-4 flex flex-col gap-3">
          <h2 className="font-semibold flex items-center gap-2 text-sm">
            <CreditCard className="w-4 h-4 text-primary" /> Способы оплаты
          </h2>
          <p className="text-xs text-muted-foreground">
            Платёжные операции обрабатываются сертифицированными провайдерами. Данные карт на серверах платформы не хранятся. Все транзакции защищены по стандарту PCI DSS.
          </p>

          <div className="flex items-start gap-3 p-3 bg-secondary/30 rounded-xl">
            <div className="w-10 h-10 bg-blue-500/15 rounded-xl flex items-center justify-center flex-shrink-0 border border-blue-500/20">
              <span className="text-blue-400 font-bold text-xs">RU</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">RuKassa</p>
              <p className="text-xs text-muted-foreground mt-0.5">Банковские карты РФ, СБП, криптовалюта, электронные кошельки</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {["МИР", "Visa", "MC", "СБП", "USDT", "BTC", "ETH"].map(m => (
                  <span key={m} className="text-[10px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded-md font-medium">{m}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-secondary/30 rounded-xl">
            <div className="w-10 h-10 bg-orange-500/15 rounded-xl flex items-center justify-center flex-shrink-0 border border-orange-500/20">
              <span className="text-orange-400 font-bold text-xs">LA</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">Lava</p>
              <p className="text-xs text-muted-foreground mt-0.5">Банковские карты, СБП, электронные кошельки, мобильные платежи</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {["МИР", "Visa", "MC", "СБП", "ЮMoney", "Payeer"].map(m => (
                  <span key={m} className="text-[10px] bg-orange-500/10 text-orange-400 px-1.5 py-0.5 rounded-md font-medium">{m}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="flex items-start gap-3 p-3 bg-secondary/30 rounded-xl">
            <div className="w-10 h-10 bg-green-500/15 rounded-xl flex items-center justify-center flex-shrink-0 border border-green-500/20">
              <span className="text-green-400 font-bold text-xs">EN</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-sm">Enot.io</p>
              <p className="text-xs text-muted-foreground mt-0.5">Карты РФ и СНГ, иностранные карты, ЮMoney, криптовалюта, P2P</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {["Карты РФ", "СНГ", "Visa/MC", "ЮMoney", "СБП", "Крипто"].map(m => (
                  <span key={m} className="text-[10px] bg-green-500/10 text-green-400 px-1.5 py-0.5 rounded-md font-medium">{m}</span>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-secondary/20 rounded-xl p-3 text-xs text-muted-foreground">
            <p className="font-semibold text-foreground mb-1">🔒 Безопасность платежей</p>
            <p>Страницы оплаты работают по протоколу HTTPS/SSL. Реквизиты карт вводятся только на странице провайдера и не передаются платформе.</p>
          </div>
        </div>

        {/* Публичная оферта */}
        <Accordion title="Публичная оферта (договор)" icon={FileText}>
          <H>1. Общие положения</H>
          <P>Настоящий документ является публичной офертой платформы Minions Market (далее — «Платформа») и определяет условия использования сервиса физическими лицами (далее — «Пользователь»).</P>
          <P>Акцептом Оферты является факт регистрации на Платформе или совершение любой транзакции. С момента акцепта Оферта считается заключённым договором.</P>
          <H>2. Предмет договора</H>
          <P>Платформа предоставляет информационный сервис для размещения объявлений о продаже и покупке цифровых игровых товаров: игровых аккаунтов, игровой валюты, предметов, ключей активации, подписок и иных виртуальных ценностей.</P>
          <P>Платформа является информационным посредником и не является стороной в сделках между пользователями.</P>
          <H>3. Условия использования</H>
          <Li>Минимальный возраст Пользователя — 18 лет.</Li>
          <Li>Один пользователь — один аккаунт. Передача аккаунта третьим лицам запрещена.</Li>
          <Li>Продавец гарантирует достоверность описания и правомерность продажи товара.</Li>
          <H>4. Ответственность сторон</H>
          <P>Платформа не несёт ответственности за качество товаров третьих лиц. При нарушении Оферты Платформа вправе приостановить доступ Пользователя к Сервису.</P>
          <H>5. Изменение условий</H>
          <P>Платформа вправе изменять условия Оферты. Актуальная редакция размещается на данной странице. Продолжение использования Сервиса означает согласие с изменёнными условиями.</P>
        </Accordion>

        {/* Порядок оплаты */}
        <Accordion title="Порядок оплаты" icon={CreditCard}>
          <H>Принятые способы оплаты</H>
          <P>Платформа принимает оплату через RuKassa, Lava и Enot.io: банковские карты (МИР, Visa, Mastercard), СБП, ЮMoney, криптовалюта, Payeer и P2P-переводы.</P>
          <H>Валюта и минимальная сумма</H>
          <Li>Все расчёты производятся в российских рублях (RUB).</Li>
          <Li>Минимальная сумма пополнения — <b>10 рублей</b>.</Li>
          <Li>Максимальная сумма может быть ограничена платёжным провайдером.</Li>
          <H>Процесс пополнения</H>
          <Li>Раздел «Кошелёк» → укажите сумму → выберите способ оплаты.</Li>
          <Li>Вы перейдёте на защищённую страницу провайдера.</Li>
          <Li>После оплаты баланс пополняется автоматически (обычно до 5 минут).</Li>
          <H>Комиссии</H>
          <P>Платформа не взимает комиссий за пополнение. Комиссия провайдера отображается до подтверждения транзакции.</P>
          <H>Статусы транзакций</H>
          <Li><b>Ожидает</b> — платёж инициирован, ожидается подтверждение.</Li>
          <Li><b>Выполнен</b> — средства зачислены на баланс.</Li>
          <Li><b>Отменён</b> — оплата не прошла или отменена пользователем.</Li>
        </Accordion>

        {/* Доставка / исполнение */}
        <Accordion title="Порядок исполнения заказа и доставка" icon={Truck}>
          <H>Тип товаров</H>
          <P>Платформа специализируется исключительно на <b>цифровых товарах</b>: игровые аккаунты, валюта, скины, ключи активации, подписки. Физическая доставка не предусмотрена.</P>
          <H>Сроки передачи товара</H>
          <Li><b>Автодоставка</b> — мгновенно после подтверждения оплаты.</Li>
          <Li><b>Ручная доставка</b> — продавец обязан передать данные в течение <b>24 часов</b>.</Li>
          <Li>Если товар не передан в течение <b>3 рабочих дней</b> — покупатель вправе открыть диспут.</Li>
          <H>Подтверждение получения</H>
          <P>Покупатель подтверждает получение в течение 72 часов. При отсутствии подтверждения сделка завершается автоматически в пользу продавца.</P>
          <H>Гарантийный период</H>
          <P>Продавец отвечает за работоспособность товара в течение 24 часов с момента передачи.</P>
          <H>Регионы обслуживания</H>
          <P>Сервис доступен пользователям по всему миру. Ограничения по способам оплаты определяются платёжными провайдерами.</P>
        </Accordion>

        {/* Возврат */}
        <Accordion title="Правила возврата и отмены платежа" icon={RefreshCw}>
          <H>Основания для возврата</H>
          <Li>Товар не передан в течение 3 рабочих дней с момента оплаты.</Li>
          <Li>Товар существенно не соответствует описанию продавца.</Li>
          <Li>Продавец не вышел на связь в течение 48 часов.</Li>
          <Li>Мошенничество со стороны продавца подтверждено администрацией.</Li>
          <H>Порядок оформления возврата</H>
          <Li>Откройте диспут в разделе «Мои сделки» в течение <b>72 часов</b> с момента оплаты.</Li>
          <Li>Опишите проблему, приложите скриншоты и переписку.</Li>
          <Li>Администрация рассматривает обращение в течение <b>3–5 рабочих дней</b>.</Li>
          <H>Сроки возврата средств</H>
          <P>Возврат на карту или кошелёк — <b>3–10 рабочих дней</b> в зависимости от провайдера. Возврат производится тем же способом, что и оплата.</P>
          <H>Отмена платежа</H>
          <P>Незавершённый платёж можно отменить на странице провайдера. Уже зачисленные средства возврату через провайдера не подлежат — их можно использовать на платформе или вывести согласно условиям вывода.</P>
          <H>Когда возврат невозможен</H>
          <Li>Товар получен и использован покупателем.</Li>
          <Li>Обращение подано позже 72 часов без уважительной причины.</Li>
          <Li>Нет доказательств нарушения со стороны продавца.</Li>
        </Accordion>

        {/* Запрещённые товары */}
        <Accordion title="Запрещённые товары и действия" icon={AlertTriangle}>
          <H>Запрещённые к продаже товары</H>
          <Li>Аккаунты, полученные незаконным путём (взлом, фишинг, кража).</Li>
          <Li>Читы, боты, программы для обхода античит-систем.</Li>
          <Li>Товары, запрещённые законодательством РФ и международными нормами.</Li>
          <Li>Краденые подарочные карты и ключи сомнительного происхождения.</Li>
          <Li>Товары, нарушающие права правообладателя.</Li>
          <Li>Предложения, вводящие покупателя в заблуждение.</Li>
          <H>Запрещённые действия</H>
          <Li>Сделки в обход платформы с целью уклонения от комиссии.</Li>
          <Li>Накрутка рейтинга через фиктивные сделки.</Li>
          <Li>Создание нескольких аккаунтов для обхода блокировки.</Li>
          <Li>Угрозы, шантаж, давление на пользователей.</Li>
          <Li>Спонсорство и пожертвования без соответствующей лицензии.</Li>
          <H>Последствия нарушений</H>
          <P>Нарушение правил влечёт блокировку аккаунта и заморозку средств. При признаках мошенничества администрация вправе обратиться в правоохранительные органы.</P>
        </Accordion>

        {/* Конфиденциальность */}
        <Accordion title="Политика конфиденциальности и персональных данных" icon={Lock}>
          <H>Собираемые данные</H>
          <Li>Имя пользователя и Telegram ID (при авторизации через Telegram).</Li>
          <Li>История транзакций и сделок.</Li>
          <Li>Технические данные: IP-адрес, тип устройства, браузер — для безопасности и предотвращения мошенничества.</Li>
          <H>Цели обработки</H>
          <Li>Обеспечение работы и безопасности платформы.</Li>
          <Li>Идентификация пользователей и предотвращение мошенничества.</Li>
          <Li>Разрешение споров между пользователями.</Li>
          <Li>Улучшение качества сервиса.</Li>
          <H>Передача данных третьим лицам</H>
          <P>Данные не продаются и не передаются третьим лицам в коммерческих целях. Раскрытие возможно только по требованию уполномоченных государственных органов.</P>
          <P>Платёжные провайдеры (RuKassa, Lava, Enot.io) обрабатывают платёжные данные согласно своей политике конфиденциальности и стандарту PCI DSS. Платформа не имеет доступа к реквизитам карт.</P>
          <H>Хранение и удаление данных</H>
          <P>Данные хранятся на защищённых серверах. Вы вправе запросить удаление аккаунта, обратившись в поддержку. Транзакционная история хранится в соответствии с требованиями финансового законодательства.</P>
          <H>Согласие на обработку персональных данных</H>
          <P>Регистрируясь на платформе, вы даёте согласие на обработку указанных данных в описанных целях в соответствии с применимым законодательством о защите персональных данных.</P>
          <H>Cookie</H>
          <P>Платформа использует технические cookie для авторизации и корректной работы сервиса. Используя платформу, вы соглашаетесь с их использованием.</P>
        </Accordion>

        {/* Пользовательское соглашение */}
        <Accordion title="Пользовательское соглашение" icon={Shield}>
          <H>1. Принятие условий</H>
          <P>Используя Minions Market, вы подтверждаете согласие с настоящим Соглашением, Публичной офертой и Политикой конфиденциальности.</P>
          <H>2. Требования к пользователям</H>
          <Li>Минимальный возраст — 18 лет.</Li>
          <Li>Запрещено создавать несколько аккаунтов.</Li>
          <Li>Пользователь несёт ответственность за свои действия на платформе.</Li>
          <H>3. Контент и объявления</H>
          <P>Пользователь отвечает за достоверность объявлений и правомерность продаваемых товаров. Запрещено размещать контент, нарушающий законодательство или права третьих лиц.</P>
          <H>4. Блокировка аккаунтов</H>
          <P>Администрация вправе без предупреждения заблокировать аккаунт при нарушении Соглашения или законодательства.</P>
          <H>5. Изменение условий</H>
          <P>Администрация вправе изменять условия Соглашения. Актуальная версия — на данной странице. Продолжение использования означает согласие с изменениями.</P>
        </Accordion>

        {/* Контакты */}
        <div className="bg-card rounded-2xl border border-border/40 p-4 flex flex-col gap-2">
          <h2 className="font-semibold flex items-center gap-2 text-sm">
            <ExternalLink className="w-4 h-4 text-primary" /> Контакты и поддержка
          </h2>
          <p className="text-xs text-muted-foreground">По вопросам, претензиям и возвратам:</p>
          <div className="space-y-2 text-sm mt-1">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <a href="mailto:anvarikromov778@gmail.com" className="text-primary hover:underline break-all">
                anvarikromov778@gmail.com
              </a>
            </div>
            <div className="flex items-center gap-2">
              <ExternalLink className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <a href="https://t.me/for_ewer0721" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                Telegram: @for_ewer0721
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
              <span className="text-muted-foreground text-xs">Ответ в течение 24 часов · Ежедневно 09:00–23:00</span>
            </div>
          </div>
        </div>

        <div className="text-center space-y-1 mt-1">
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
