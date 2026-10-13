package §_-0V§
{
   import §_-2g§.§var§;
   import §_-2s§.§_-u§;
   import bobby.§ null§;
   import bobby.§_-0v§;
   import bobby.§_-1Q§;
   import bobby.§_-3e§;
   import bobby.§_-3h§;
   import flash.display.MovieClip;
   import flash.events.Event;
   import flash.utils.getTimer;
   import flash.utils.setTimeout;
   
   public class §_-h§ extends § null§
   {
      
      public const §_-5j§:Number = 225;
      
      public const §_-16§:Number = -400;
      
      public const §_-1p§:Number = 0.9;
      
      public var §case §:Number = 1;
      
      public var include:Number = 1;
      
      public var §do§:Number = 1;
      
      public var dx:Number = 0;
      
      public var dy:Number = 0;
      
      private var §_-4t§:Number = 1200;
      
      public var §extends§:Boolean = false;
      
      private var §_-0K§:Boolean = false;
      
      private var §_-0b§:Boolean = false;
      
      private var §_-5H§:Boolean = false;
      
      private var §_-2w§:Boolean = false;
      
      private var §_-0I§:Boolean = false;
      
      public var final:Boolean = false;
      
      private var §true§:Number = 0;
      
      private var currentSwing:§ null§;
      
      public var §_-4l§:Boolean = false;
      
      private var §_-2O§:Number = 0;
      
      public var §_-4d§:Array = [];
      
      public var §_-5c§:Array = [];
      
      public var §_-1H§:Array = [];
      
      public var §_-X§:Array = [];
      
      public var §_-2I§:Array = [];
      
      private var §_-3x§:Boolean = false;
      
      private var §_-2T§:Number = 0;
      
      private var §_-5R§:Number = 0;
      
      private var §_-4y§:Number = 100;
      
      private var §_-5V§:Number = 100;
      
      private var §_-S§:Number = 0;
      
      private var computerReturnToHome:Boolean = false;
      
      private var §_-41§:Boolean = false;
      
      public var §_-1T§:Number = 0;
      
      private var §_-8§:Number = 0;
      
      private var §_-1m§:Boolean = false;
      
      private var computerServingTrigger:Boolean = false;
      
      private var §_-3a§:Number = 0;
      
      public function §_-h§()
      {
         super();
      }
      
      public function set §implements§(param1:Number) : void
      {
         this.§_-2T§ = param1;
         this.§_-5R§ = param1;
      }
      
      public function get §implements§() : Number
      {
         return this.§_-2T§;
      }
      
      override public function handleStageAdd(param1:Event) : void
      {
         super.handleStageAdd(param1);
         MovieClip(this).overheadSwing.visible = true;
         MovieClip(this).underhandSwing.visible = false;
         MovieClip(this).serveSwing.visible = false;
         this.setupOverhead();
      }
      
      private function §_-52§(param1:Array) : void
      {
         var _loc2_:int = 0;
         if(param1.length > 0)
         {
            _loc2_ = §_-3e§.§ else§(0,param1.length - 1,true);
            this.setupTrashTalk(param1[_loc2_]);
         }
      }
      
      public function setupTrashTalk(param1:String) : void
      {
         var _loc2_:§var§ = new §var§(param1);
         §_-h§(this).addChild(_loc2_);
         _loc2_.x = -20 * §_-3e§.§_-1w§(scaleX);
         _loc2_.y = -70;
         _loc2_.scaleX *= §_-3e§.§_-1w§(scaleX);
      }
      
      public function §_-3D§() : void
      {
         if(§_-3e§.§_-3M§(25))
         {
         }
      }
      
      public function §_-5f§() : void
      {
         if(§_-3e§.§_-3M§(25))
         {
         }
      }
      
      public function §_-5g§() : void
      {
      }
      
      public function §_-47§() : void
      {
      }
      
      public function §package§() : void
      {
         this.§_-4l§ = true;
      }
      
      public function §each §() : *
      {
         setTimeout(this.§_-52§,1000,this.§_-4d§);
      }
      
      public function §_-2R§(param1:String) : *
      {
         setTimeout(this.setupTrashTalk,1000,param1);
      }
      
      public function §_-3A§(param1:Number) : void
      {
         this.§_-3a§ = param1;
      }
      
      public function setupServe() : void
      {
         this.final = true;
         this.§_-5H§ = false;
         this.§_-2w§ = false;
         this.currentSwing = MovieClip(this).serveSwing;
         MovieClip(this).overheadSwing.gotoAndStop(1);
         MovieClip(this).underhandSwing.gotoAndStop(1);
         MovieClip(this).serveSwing.gotoAndStop(1);
         MovieClip(this).overheadSwing.visible = false;
         MovieClip(this).underhandSwing.visible = false;
         MovieClip(this).serveSwing.visible = true;
         if(this.final && scaleX > 0 && x > §_-u§.§_-0l§.x - §_-u§.§_-4N§ - 20)
         {
            x = §_-u§.§_-0l§.x - §_-u§.§_-4N§ - 20;
         }
         if(this.final && scaleX < 0 && x < §_-u§.§_-0l§.x + §_-u§.§_-4N§ + 20)
         {
            x = §_-u§.§_-0l§.x + §_-u§.§_-4N§ + 20;
         }
         if(this.§_-4l§)
         {
            if(§_-3e§.§_-3M§(33))
            {
               this.§_-8§ = §_-u§.§_-0l§.x + §_-u§.§_-4N§ + 20;
               if(§_-3e§.§_-3M§(this.§implements§))
               {
                  this.§_-1m§ = false;
               }
               else
               {
                  this.§_-1m§ = true;
               }
            }
            else if(§_-3e§.§_-3M§(50))
            {
               this.§_-8§ = 526;
               this.§_-1m§ = false;
            }
            else
            {
               this.§_-8§ = 570;
               this.§_-1m§ = false;
            }
         }
      }
      
      public function setupOverhead() : void
      {
         if(!this.final)
         {
            this.final = false;
            this.§_-5H§ = false;
            this.§_-2w§ = true;
            this.currentSwing = MovieClip(this).overheadSwing;
            MovieClip(this).overheadSwing.visible = true;
            MovieClip(this).underhandSwing.visible = false;
            MovieClip(this).serveSwing.visible = false;
         }
      }
      
      public function setupUnderhand() : void
      {
         if(!this.final)
         {
            this.final = false;
            this.§_-5H§ = false;
            this.§_-2w§ = false;
            this.currentSwing = MovieClip(this).underhandSwing;
            MovieClip(this).overheadSwing.visible = false;
            MovieClip(this).underhandSwing.visible = true;
            MovieClip(this).serveSwing.visible = false;
         }
      }
      
      public function swingBack() : void
      {
         this.§_-0I§ = false;
      }
      
      public function swingMe() : void
      {
         var _loc1_:Boolean = false;
         var _loc2_:Boolean = false;
         if(!this.§_-5H§ && this.currentSwing.currentFrame == 1)
         {
            §_-3h§.§true §("whoosh.mp3");
            this.§_-5H§ = true;
            _loc1_ = false;
            if(this.dy > -100 && this.§extends§)
            {
               MovieClip(this).underHitbox.y = MovieClip(this).underHitbox.y + 20;
            }
            if(!this.final && §_-u§.§_-3j§ != null && Boolean(MovieClip(this).underHitbox.hitTestPoint(§_-u§.§_-3j§.x,§_-u§.§_-3j§.y,true)))
            {
               _loc1_ = true;
            }
            if(this.dy > -100 && this.§extends§)
            {
               MovieClip(this).underHitbox.y = MovieClip(this).underHitbox.y - 20;
            }
            if(_loc1_ && (§_-u§.§_-3j§.dy > 0 || §_-u§.§_-3j§.y > §_-u§.§_-3c§.y))
            {
               this.setupUnderhand();
            }
            _loc2_ = false;
            if(scaleX > 0 && §_-u§.§_-3j§ != null && §_-u§.§_-3j§.x > §_-u§.§_-0m§.x - 15)
            {
               _loc2_ = true;
            }
            else if(scaleX < 0 && §_-u§.§_-3j§ != null && §_-u§.§_-3j§.x < §_-u§.§_-0m§.x + 15)
            {
               _loc2_ = true;
            }
            if(_loc1_ && !this.§_-4l§ && _loc2_)
            {
               this.setupOverhead();
            }
            if(_loc1_ && this.§_-4l§ && §_-3e§.§_-3M§(this.§_-1T§))
            {
               this.setupOverhead();
            }
            if(!this.final)
            {
               this.§_-0I§ = true;
            }
            else
            {
               this.§_-0I§ = false;
            }
            this.currentSwing.play();
         }
      }
      
      public function serveBirdie() : void
      {
         this.final = false;
         §_-u§(§_-0v§.§_-b§).§_-3R§(MovieClip(this).servePoint.x * §_-3e§.§_-1w§(scaleX) + x,MovieClip(this).servePoint.y + y);
         var _loc1_:Number = 1350 * 1.1;
         var _loc2_:Number = 40 * §_-3e§.§_-1w§(scaleX);
         §_-u§.§_-3j§.§_-5z§(_loc1_,_loc2_,"serve");
         §_-u§.§import§ = this;
      }
      
      private function §_-48§() : void
      {
         var _loc1_:Number = NaN;
         var _loc2_:Number = NaN;
         if(this.currentSwing != null && §_-u§.§_-3j§ != null && this.§_-0I§)
         {
            if(MovieClip(this).currentSwing.racket.body.hitbox2.hitTestPoint(§_-u§.§_-3j§.x,§_-u§.§_-3j§.y))
            {
               this.§_-0I§ = false;
               this.§_-2T§ += 7;
               if(this.§_-2w§)
               {
                  _loc1_ = (MovieClip(this).currentSwing.racket.rotation + 30) * §_-3e§.§_-1w§(scaleX);
                  _loc2_ = 1250 * 1.4 * this.§do§ * this.§_-1p§;
               }
               else
               {
                  if(!this.§extends§)
                  {
                     _loc2_ = 1300 * 1.4 * this.§do§ * this.§_-1p§;
                  }
                  else
                  {
                     _loc2_ = 1150 * 1.4 * this.§do§ * this.§_-1p§;
                  }
                  _loc1_ = (180 - MovieClip(this).currentSwing.racket.rotation - 50) * §_-3e§.§_-1w§(scaleX);
               }
               if(this.§_-2w§)
               {
                  §_-u§.§_-3j§.§_-5z§(_loc2_,_loc1_);
               }
               else
               {
                  §_-u§.§_-3j§.§_-5z§(_loc2_,40 * §_-3e§.§_-1w§(scaleX),"underhand");
               }
               §_-u§.§import§ = this;
            }
         }
      }
      
      public function jumpMe() : void
      {
         this.dy = this.§_-16§ * this.include;
         this.§extends§ = true;
      }
      
      override public function handleEnterFrame(param1:Number) : void
      {
         super.handleEnterFrame(param1);
         if(this.§_-4l§)
         {
            this.§_-2p§();
         }
         else
         {
            this.humanControlHandler();
         }
         if(this.§extends§)
         {
            this.dy += this.§_-4t§ * param1;
            gotoAndStop("jump");
         }
         x += this.dx * param1;
         y += this.dy * param1;
         if(x < 0 + §_-u§.§try § + 15)
         {
            x = 0 + §_-u§.§try § + 15;
         }
         if(x > stage.stageWidth - §_-u§.§try § - 15)
         {
            x = stage.stageWidth - §_-u§.§try § - 15;
         }
         if(scaleX > 0 && x > §_-u§.§_-0l§.x - §_-u§.§_-2N§)
         {
            x = §_-u§.§_-0l§.x - §_-u§.§_-2N§;
         }
         if(scaleX < 0 && x < §_-u§.§_-0l§.x + §_-u§.§_-2N§)
         {
            x = §_-u§.§_-0l§.x + §_-u§.§_-2N§;
         }
         if(this.final && scaleX > 0 && x > §_-u§.§_-0l§.x - §_-u§.§_-4N§ - 20)
         {
            x = §_-u§.§_-0l§.x - §_-u§.§_-4N§ - 20;
         }
         if(this.final && scaleX < 0 && x < §_-u§.§_-0l§.x + §_-u§.§_-4N§ + 20)
         {
            x = §_-u§.§_-0l§.x + §_-u§.§_-4N§ + 20;
         }
         if(y > §_-u§.§_-0o§ && this.§extends§)
         {
            this.§extends§ = false;
            this.§_-0K§ = false;
            this.dy = 0;
            y = §_-u§.§_-0o§;
         }
         this.§_-48§();
      }
      
      public function humanControlHandler() : void
      {
         var _loc1_:Boolean = false;
         var _loc2_:Boolean = false;
         var _loc3_:Boolean = false;
         var _loc4_:Boolean = false;
         if(this.§_-3a§ == 0)
         {
            if(§_-1Q§.keyPressedUp || §_-1Q§.§_-a§)
            {
               _loc1_ = true;
            }
            else
            {
               _loc1_ = false;
            }
            if(§_-1Q§.keyPressedDown || §_-1Q§.§ var§ || §_-1Q§.keyPressedSpace)
            {
               _loc2_ = true;
            }
            else
            {
               _loc2_ = false;
            }
            if(§_-1Q§.keyPressedLeft || §_-1Q§.§_-5a§)
            {
               _loc3_ = true;
            }
            else
            {
               _loc3_ = false;
            }
            if(§_-1Q§.keyPressedRight || §_-1Q§.§_-38§)
            {
               _loc4_ = true;
            }
            else
            {
               _loc4_ = false;
            }
         }
         else if(this.§_-3a§ == 1)
         {
            if(§_-1Q§.§_-a§)
            {
               _loc1_ = true;
            }
            else
            {
               _loc1_ = false;
            }
            if(§_-1Q§.§ var§ || §_-1Q§.keyPressedSpace)
            {
               _loc2_ = true;
            }
            else
            {
               _loc2_ = false;
            }
            if(§_-1Q§.§_-5a§)
            {
               _loc3_ = true;
            }
            else
            {
               _loc3_ = false;
            }
            if(§_-1Q§.§_-38§)
            {
               _loc4_ = true;
            }
            else
            {
               _loc4_ = false;
            }
         }
         else
         {
            if(§_-1Q§.keyPressedUp)
            {
               _loc1_ = true;
            }
            else
            {
               _loc1_ = false;
            }
            if(§_-1Q§.keyPressedDown)
            {
               _loc2_ = true;
            }
            else
            {
               _loc2_ = false;
            }
            if(§_-1Q§.keyPressedLeft)
            {
               _loc3_ = true;
            }
            else
            {
               _loc3_ = false;
            }
            if(§_-1Q§.keyPressedRight)
            {
               _loc4_ = true;
            }
            else
            {
               _loc4_ = false;
            }
         }
         if(_loc4_ && _loc3_)
         {
            this.dx = 0;
            gotoAndStop("normal");
         }
         else if(_loc4_)
         {
            this.dx = this.§_-5j§ * this.§case §;
            if(scaleX > 0)
            {
               gotoAndStop("forward");
            }
            else
            {
               gotoAndStop("backward");
            }
         }
         else if(_loc3_)
         {
            this.dx = -this.§_-5j§ * this.§case §;
            if(scaleX > 0)
            {
               gotoAndStop("backward");
            }
            else
            {
               gotoAndStop("forward");
            }
         }
         else
         {
            this.dx = 0;
            gotoAndStop("normal");
         }
         if(_loc1_ && !this.§_-0K§ && this.§extends§ && this.§_-0b§)
         {
            this.§_-0K§ = true;
         }
         if(_loc1_ && !this.§extends§ && this.§_-0b§)
         {
            this.dy = this.§_-16§ * this.include;
            this.§extends§ = true;
         }
         if(_loc1_)
         {
            this.§_-0b§ = false;
         }
         else
         {
            this.§_-0b§ = true;
         }
         if(_loc2_)
         {
            if(!this.§_-3x§)
            {
               this.swingMe();
            }
            this.§_-3x§ = true;
         }
         else
         {
            this.§_-3x§ = false;
         }
      }
      
      private function §_-2p§() : void
      {
         var targetX:Number = NaN;
         var distVar:Number = NaN;
         if(this.final)
         {
            targetX = this.§_-8§;
         }
         else if(this.computerReturnToHome || §_-u§.§_-3j§ == null || §_-u§.§import§ == this || §_-u§.§_-3j§.x < stage.stageWidth / 2)
         {
            targetX = 450;
         }
         else if(§_-u§.§_-3j§ != null)
         {
            if(§_-u§.§_-3j§.§else § > 450 && §_-u§.§_-3j§.x < 340)
            {
               targetX = 450;
            }
            else
            {
               if(this.§_-4y§ < this.§implements§)
               {
                  if(§_-u§.§_-3j§.§else § < stage.stageWidth / 2 + 240)
                  {
                     distVar = 100 - (§_-u§.§_-3j§.§else § - stage.stageWidth / 2) / 11;
                  }
                  else
                  {
                     distVar = 20;
                  }
               }
               else
               {
                  distVar = 20;
                  if(this.§_-5V§ < (100 - this.§implements§) / 2)
                  {
                     if(§_-u§.§_-3j§.§else § < stage.stageWidth / 2 + 240)
                     {
                        distVar = 70 - (§_-u§.§_-3j§.§else § - stage.stageWidth / 2) / 11;
                     }
                  }
               }
               if(§_-u§.§_-1i§ == §_-5G§ && §_-u§.§_-3j§.§else § > stage.stageWidth / 2 + 220)
               {
                  distVar = 20;
               }
               else if(§_-u§.§_-1i§ == §_-5G§ && §_-u§.§_-3j§.§else § > stage.stageWidth / 2 + 50)
               {
                  distVar += 0;
               }
               if(Math.abs(this.§_-S§ - §_-u§.§_-3j§.x) > 8 || this.§_-4y§ < this.§implements§ || this.§_-5V§ < (100 - this.§implements§) / 2)
               {
                  targetX = §_-u§.§_-3j§.x + distVar;
                  this.§_-S§ = §_-u§.§_-3j§.x;
               }
               else
               {
                  targetX = this.§_-S§ + distVar;
               }
            }
         }
         if(!§_-u§.§_-3P§ && !this.§_-41§)
         {
            this.§_-41§ = true;
            setTimeout(function():*
            {
               computerReturnToHome = true;
            },1000);
         }
         else if(§_-u§.§_-3P§ && this.§_-41§)
         {
            this.§_-41§ = false;
            this.computerReturnToHome = false;
            this.§_-4y§ = 100;
            this.§_-5V§ = 100;
            this.§_-2T§ = this.§_-5R§ - 7;
         }
         if(Math.abs(targetX - x) < 10)
         {
            this.dx = 0;
            gotoAndStop("normal");
         }
         else if(targetX - x < 0)
         {
            this.dx = this.§_-5j§ * §_-3e§.§_-1w§(scaleX) * this.§case §;
            gotoAndStop("forward");
         }
         else if(targetX - x > 0)
         {
            this.dx = -this.§_-5j§ * §_-3e§.§_-1w§(scaleX) * this.§case §;
            gotoAndStop("backward");
         }
         else
         {
            this.dx = 0;
            gotoAndStop("normal");
         }
         if(§_-u§.§_-3j§ != null && Math.abs(§_-u§.§_-3j§.y - 190) < 10 && §_-u§.§import§ != this && x - 60 - §_-u§.§_-3j§.x < 20 && this.§_-5V§ < (100 - this.§implements§) / 2 && this.§_-4y§ >= this.§implements§ && !this.§extends§)
         {
            this.jumpMe();
         }
         if(this.§extends§)
         {
            MovieClip(this).computerHitbox.y = MovieClip(this).computerHitbox.y - 20;
         }
         if(Boolean(getTimer() - this.§_-2O§ > 500 && §_-u§.§_-3P§ && §_-u§.§_-3j§ != null && MovieClip(this).computerHitbox.hitTestPoint(§_-u§.§_-3j§.x,§_-u§.§_-3j§.y,true)) && Boolean(§_-u§.§import§ != this) && §_-u§.§_-3j§.x > §_-u§.§_-0l§.x)
         {
            this.§_-2O§ = getTimer();
            this.swingMe();
            if(this.§_-4l§)
            {
               this.§_-4y§ = §_-3e§.§ else§(0,100);
               this.§_-5V§ = §_-3e§.§ else§(0,100);
            }
         }
         if(this.§extends§)
         {
            MovieClip(this).computerHitbox.y = MovieClip(this).computerHitbox.y + 20;
         }
         if(this.final)
         {
            if(Math.abs(this.§_-8§ - x) < 10 && !this.computerServingTrigger)
            {
               this.computerServingTrigger = true;
               if(this.§_-1m§)
               {
                  setTimeout(function():*
                  {
                     if(!§extends§)
                     {
                        jumpMe();
                     }
                  },200);
                  setTimeout(function():*
                  {
                     swingMe();
                     computerServingTrigger = false;
                  },300);
               }
               else
               {
                  setTimeout(function():*
                  {
                     swingMe();
                     computerServingTrigger = false;
                  },200);
               }
               if(this.§_-4l§)
               {
                  this.§_-4y§ = §_-3e§.§ else§(0,100);
                  this.§_-5V§ = §_-3e§.§ else§(0,100);
               }
            }
         }
      }
      
      override public function handleRemove(param1:Event) : void
      {
         super.handleRemove(param1);
      }
   }
}

